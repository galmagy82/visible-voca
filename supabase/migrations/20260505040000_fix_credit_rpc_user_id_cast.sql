-- ============================================================================
-- 크레딧 RPC 함수 수정 — user_usage.user_id (text) vs p_user_id (uuid) 명시 캐스팅
-- ----------------------------------------------------------------------------
-- 배경:
--   기존 마이그레이션(20260505030000) 의 RPC 함수들은 user_usage.user_id 가
--   text 타입인데 p_user_id 인자는 uuid 라 직접 비교 시 에러 발생:
--     ERROR: 42883: operator does not exist: text = uuid
--   credit_transactions.user_id 는 uuid (auth.users 참조) 라 그쪽은 OK.
--
-- 수정:
--   - user_usage 접근 시 모두 p_user_id::text 로 명시 캐스팅
--   - credit_transactions 접근은 그대로 (uuid 매칭)
--
-- CREATE OR REPLACE 라 기존 함수 안전하게 덮어쓰기.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- consume_credits — user_usage 접근 시 ::text 캐스팅
-- ----------------------------------------------------------------------------
create or replace function consume_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlimited boolean;
  v_balance integer;
  v_new_balance integer;
  v_user_id_text text := p_user_id::text;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount: consume amount must be positive (got %)', p_amount;
  end if;

  select unlimited, credit_balance into v_unlimited, v_balance
  from user_usage
  where user_id = v_user_id_text
  for update;

  if not found then
    raise exception 'user_usage_not_found: user_id=%', p_user_id;
  end if;

  if v_unlimited then
    insert into credit_transactions(user_id, type, amount, balance_after, description)
    values (p_user_id, 'consume', -p_amount, v_balance, coalesce(p_description, '') || ' (unlimited)');
    return v_balance;
  end if;

  if v_balance < p_amount then
    raise exception 'insufficient_credits: balance=%, requested=%', v_balance, p_amount;
  end if;

  v_new_balance := v_balance - p_amount;

  update user_usage
  set credit_balance = v_new_balance
  where user_id = v_user_id_text;

  insert into credit_transactions(user_id, type, amount, balance_after, description)
  values (p_user_id, 'consume', -p_amount, v_new_balance, p_description);

  return v_new_balance;
end;
$$;

revoke all on function consume_credits(uuid, integer, text) from public;
grant execute on function consume_credits(uuid, integer, text) to service_role;

-- ----------------------------------------------------------------------------
-- charge_credits — user_usage 접근 시 ::text 캐스팅
-- ----------------------------------------------------------------------------
create or replace function charge_credits(
  p_user_id uuid,
  p_amount integer,
  p_payment_key text,
  p_order_id text,
  p_description text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_new_balance integer;
  v_user_id_text text := p_user_id::text;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount: charge amount must be positive (got %)', p_amount;
  end if;
  if p_payment_key is null or length(p_payment_key) = 0 then
    raise exception 'invalid_payment_key: payment_key required for charge';
  end if;

  select credit_balance into v_balance
  from user_usage
  where user_id = v_user_id_text
  for update;

  if not found then
    insert into user_usage(user_id, credit_balance)
    values (v_user_id_text, p_amount);
    v_new_balance := p_amount;
  else
    v_new_balance := v_balance + p_amount;
    update user_usage
    set credit_balance = v_new_balance
    where user_id = v_user_id_text;
  end if;

  insert into credit_transactions(user_id, type, amount, balance_after, payment_key, order_id, description)
  values (p_user_id, 'charge', p_amount, v_new_balance, p_payment_key, p_order_id, p_description);

  return v_new_balance;
end;
$$;

revoke all on function charge_credits(uuid, integer, text, text, text) from public;
grant execute on function charge_credits(uuid, integer, text, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- grant_signup_bonus — user_usage 접근 시 ::text 캐스팅 + ON CONFLICT 회피
-- ----------------------------------------------------------------------------
-- ON CONFLICT 도 (text vs uuid) 에서 잠재적 문제 가능성이라 SELECT 후 분기로 변경.
-- ----------------------------------------------------------------------------
create or replace function grant_signup_bonus(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_already_granted boolean;
  v_user_id_text text := p_user_id::text;
begin
  -- 이미 가입 보너스 받았는지 체크 (멱등성)
  select exists(
    select 1 from credit_transactions
    where user_id = p_user_id and type = 'signup_bonus'
  ) into v_already_granted;

  if v_already_granted then
    select credit_balance into v_balance from user_usage where user_id = v_user_id_text;
    return coalesce(v_balance, 0);
  end if;

  -- user_usage row 있는지 체크
  select credit_balance into v_balance from user_usage where user_id = v_user_id_text;

  if v_balance is null then
    insert into user_usage(user_id, credit_balance) values (v_user_id_text, 30);
    v_balance := 30;
  else
    update user_usage
    set credit_balance = credit_balance + 30
    where user_id = v_user_id_text;
    v_balance := v_balance + 30;
  end if;

  insert into credit_transactions(user_id, type, amount, balance_after, description)
  values (p_user_id, 'signup_bonus', 30, v_balance, '신규 가입 보너스 30 크레딧');

  return v_balance;
end;
$$;

revoke all on function grant_signup_bonus(uuid) from public;
grant execute on function grant_signup_bonus(uuid) to service_role;
