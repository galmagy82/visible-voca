-- ============================================================================
-- grant_signup_bonus 이중 적립 차단
-- ----------------------------------------------------------------------------
-- 문제:
--   신규 가입자가 60 크레딧을 받는 사례 발견. 두 경로에서 30 씩 적립이 겹침:
--     (1) user_usage.credit_balance 컬럼 DEFAULT 30
--         어떤 경로로든 user_usage 에 신규 row 가 만들어지면 자동 30 적립.
--         예: vocabulary.html 첫 검색 시 incrementTrialCount() 가 INSERT 함.
--     (2) grant_signup_bonus RPC 의 UPDATE 분기
--         row 가 이미 있을 때 +30 추가 적립 → DEFAULT 30 위에 또 30 → 60.
--
-- 해결:
--   DEFAULT 30 자체를 가입 보너스로 간주. RPC 는 잔액을 더 바꾸지 않고
--   row 가 없을 때만 첫 INSERT 를 보장하며, ledger 에 이력만 남긴다.
--
--   - 멱등성 체크 (signup_bonus 거래 이력) 는 그대로 유지.
--   - row 가 없으면 INSERT (DEFAULT 30 자동 적용).
--   - row 가 이미 있으면 잔액 그대로 — 추가 적립 X.
--   - credit_transactions 에 이력 1회 기록 (다음 호출은 멱등 NOOP).
--
-- 영향:
--   - 신규 가입자: 30 크레딧 (정확).
--   - 이미 60 받은 기존 사용자: 그대로 둠 (선의로 더 받은 셈).
--     운영자가 필요시 수동으로 30 으로 조정 가능 (UPDATE user_usage SET ...).
-- ============================================================================

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
  -- 멱등성 체크 — 이미 보너스 받은 이력 있으면 잔액만 반환 후 종료
  select exists(
    select 1 from credit_transactions
    where user_id = p_user_id and type = 'signup_bonus'
  ) into v_already_granted;

  if v_already_granted then
    select credit_balance into v_balance from user_usage where user_id = v_user_id_text;
    return coalesce(v_balance, 0);
  end if;

  -- 첫 호출
  select credit_balance into v_balance from user_usage where user_id = v_user_id_text;

  if v_balance is null then
    -- row 없음 → INSERT (credit_balance DEFAULT 30 자동 적용)
    insert into user_usage(user_id, credit_balance) values (v_user_id_text, 30);
    v_balance := 30;
  end if;
  -- row 가 이미 있으면 (다른 경로에서 INSERT 되며 DEFAULT 30 자동 적립됨) 잔액 그대로.
  -- 추가 적립 X — 이중 적립 방지.

  -- 거래 이력 기록 (다음 호출 시 멱등성 체크 통과 위해)
  insert into credit_transactions(user_id, type, amount, balance_after, description)
  values (p_user_id, 'signup_bonus', 30, v_balance, '신규 가입 보너스 30 크레딧');

  return v_balance;
end;
$$;

revoke all on function grant_signup_bonus(uuid) from public;
grant execute on function grant_signup_bonus(uuid) to service_role;
