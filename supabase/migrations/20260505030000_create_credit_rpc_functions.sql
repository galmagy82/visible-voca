-- ============================================================================
-- 크레딧 RPC 함수 — consume / charge / grant_signup_bonus
-- ----------------------------------------------------------------------------
-- 공통 정책:
--   - SECURITY DEFINER: RLS 우회. 클라이언트 직접 INSERT/UPDATE 차단되니 이 함수로만 변경.
--   - 모든 함수는 user_usage UPDATE + credit_transactions INSERT 를 한 트랜잭션으로 처리.
--     race condition 방어 위해 user_usage row 에 lock (FOR UPDATE) 잡음.
--   - 잔액 부족·중복 등 비정상 상태는 RAISE EXCEPTION 으로 명확히 신호.
--
-- 권한:
--   - charge_credits: 결제 webhook (Edge Function) 만 호출 → service_role 권한으로 호출 (RLS 우회)
--                     anon/authenticated 에게는 EXECUTE 권한 부여하지 않음 (사용자가 직접 충전 불가)
--   - consume_credits: 분석 처리 후 Edge Function 에서 호출 → service_role 권한
--   - grant_signup_bonus: 신규 가입 시 Edge Function 또는 트리거에서 호출 → service_role 권한
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- consume_credits(user_id, amount, description) → 새 잔액 반환
-- ----------------------------------------------------------------------------
-- - unlimited=true 면 차감 스킵 + 이력만 기록 (사용 패턴 모니터링용)
-- - 잔액 < amount 면 'insufficient_credits' 예외
-- - amount 는 양수 (차감량). 함수 내부에서 음수로 변환해 amount 컬럼에 기록.
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
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount: consume amount must be positive (got %)', p_amount;
  end if;

  -- 동시 차감 방어: row lock
  select unlimited, credit_balance into v_unlimited, v_balance
  from user_usage
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'user_usage_not_found: user_id=%', p_user_id;
  end if;

  -- 무제한 계정: 차감 X, 이력만 (description 끝에 ' (unlimited)' 마커)
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
  where user_id = p_user_id;

  insert into credit_transactions(user_id, type, amount, balance_after, description)
  values (p_user_id, 'consume', -p_amount, v_new_balance, p_description);

  return v_new_balance;
end;
$$;

revoke all on function consume_credits(uuid, integer, text) from public;
grant execute on function consume_credits(uuid, integer, text) to service_role;

-- ----------------------------------------------------------------------------
-- charge_credits(user_id, amount, payment_key, order_id, description) → 새 잔액 반환
-- ----------------------------------------------------------------------------
-- - 토스페이먼츠 결제 승인 후 Edge Function webhook 에서 호출
-- - payment_key UNIQUE 제약으로 같은 결제 두 번 처리되지 않음 (멱등성)
-- - amount 는 양수 (충전량)
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
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount: charge amount must be positive (got %)', p_amount;
  end if;
  if p_payment_key is null or length(p_payment_key) = 0 then
    raise exception 'invalid_payment_key: payment_key required for charge';
  end if;

  -- 동시성 방어: row lock. user_usage row 가 없으면 만들면서 충전.
  select credit_balance into v_balance
  from user_usage
  where user_id = p_user_id
  for update;

  if not found then
    -- 첫 결제인데 user_usage row 가 아직 없는 경우 — 신규 가입 후 첫 액션이 결제일 때.
    -- 가입 보너스 30 + 충전 amount 합쳐서 만듦 (또는 충전만? 정책 결정).
    -- 일단 가입 보너스 별도, 충전만으로 row 생성:
    -- 다른 컬럼(trial_count, subscribed 등) 은 DEFAULT 값으로 채워짐
    insert into user_usage(user_id, credit_balance)
    values (p_user_id, p_amount);
    v_new_balance := p_amount;
  else
    v_new_balance := v_balance + p_amount;
    update user_usage
    set credit_balance = v_new_balance
    where user_id = p_user_id;
  end if;

  -- payment_key UNIQUE 제약이 있어 같은 결제 두 번 호출 시 여기서 예외 발생
  -- → webhook 중복 호출 자동 차단 (멱등성)
  insert into credit_transactions(user_id, type, amount, balance_after, payment_key, order_id, description)
  values (p_user_id, 'charge', p_amount, v_new_balance, p_payment_key, p_order_id, p_description);

  return v_new_balance;
end;
$$;

revoke all on function charge_credits(uuid, integer, text, text, text) from public;
grant execute on function charge_credits(uuid, integer, text, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- grant_signup_bonus(user_id) → 새 잔액 반환
-- ----------------------------------------------------------------------------
-- - 신규 가입 시 한 번만 호출 (Edge Function 또는 가입 트리거에서)
-- - user_usage row 가 없으면 생성 + 30 적립, 있으면 이미 받은 것으로 간주하고 NOOP
-- - 멱등성: 여러 번 호출돼도 한 번만 적립 (signup_bonus 거래 이력으로 체크)
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
begin
  -- 이미 가입 보너스 받았는지 체크 (멱등성)
  select exists(
    select 1 from credit_transactions
    where user_id = p_user_id and type = 'signup_bonus'
  ) into v_already_granted;

  if v_already_granted then
    select credit_balance into v_balance from user_usage where user_id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  -- user_usage row 생성 또는 잔액 + 30
  -- DEFAULT 30 으로 자동 생성되지만, 명시적 INSERT 로 의도 명확히.
  -- 다른 컬럼(trial_count, subscribed 등) 은 DEFAULT 값으로 채워짐.
  insert into user_usage(user_id, credit_balance)
  values (p_user_id, 30)
  on conflict (user_id) do update
    set credit_balance = user_usage.credit_balance + 30;

  select credit_balance into v_balance from user_usage where user_id = p_user_id;

  insert into credit_transactions(user_id, type, amount, balance_after, description)
  values (p_user_id, 'signup_bonus', 30, v_balance, '신규 가입 보너스 30 크레딧');

  return v_balance;
end;
$$;

revoke all on function grant_signup_bonus(uuid) from public;
grant execute on function grant_signup_bonus(uuid) to service_role;
