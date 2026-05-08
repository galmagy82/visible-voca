-- ============================================================================
-- user_usage.unlimited 기본값 true 로 전환 + 기존 사용자 일괄 백필
-- ----------------------------------------------------------------------------
-- 배경:
--   사업자등록 / 토스페이먼츠 충전(Stage C) 도입 전까지 모든 사용자에게
--   무제한 크레딧을 풀어 베타 운영 (2026-05-08 결정).
--   결제 도입 시점에 기본값을 false 로 되돌리고 잔액 정책 재가동 예정.
--
-- 변경:
--   1) user_usage.unlimited DEFAULT false → true
--      신규 가입 시 row 가 만들어지면 자동 무제한.
--   2) user_usage.credit_balance DEFAULT 30 → 0
--      무제한 모드에서는 잔액이 의미 없음. 결제 도입 시점에 다시 의미 갖도록 0 으로.
--   3) 기존 user_usage 사용자 전체에 unlimited = true 백필.
--
-- 주의:
--   - consume_credits RPC 는 이미 unlimited=true 분기에서 차감을 스킵하도록
--     구현되어 있어 함수 변경 불필요 (20260505030000 / 20260505040000 참고).
--   - grant_signup_bonus 는 호출돼도 잔액 변경 거의 없음 (이미 row 있으면 NOOP,
--     없으면 INSERT 시 credit_balance DEFAULT 0 적용 — 무제한 모드라 영향 없음).
--   - 결제(Stage C) 도입 시: 이 마이그레이션 효과 되돌리는 별도 마이그레이션 필요.
-- ============================================================================

-- 1) DEFAULT 값 변경
ALTER TABLE user_usage
  ALTER COLUMN unlimited      SET DEFAULT true,
  ALTER COLUMN credit_balance SET DEFAULT 0;

-- 2) 기존 사용자 일괄 백필 (unlimited = false 인 사용자만 갱신)
UPDATE user_usage
   SET unlimited = true
 WHERE unlimited = false;
