-- ============================================================================
-- user_usage 테이블에 크레딧 컬럼 추가 (충전식 결제 모델)
-- ----------------------------------------------------------------------------
-- 배경:
--   기존 무료 5회 + Stripe 구독 모델에서 충전식 크레딧 모델로 전환 (2026-05-04 결정).
--   상세 정책: 프로젝트 루트 MONETIZATION.md 참고.
--
-- 추가 컬럼:
--   - credit_balance: 현재 잔액 (정수). 신규 사용자는 30 크레딧 무료 체험으로 시작.
--   - unlimited: 운영자/베타 테스터용 무제한 플래그. true 면 consume RPC 가 차감 스킵.
--
-- 정책:
--   - 잔액은 직접 UPDATE 가 아니라 SECURITY DEFINER RPC (charge_credits / consume_credits)
--     를 통해서만 변경 — 다음 마이그레이션에서 함수 정의.
--   - 신규 row INSERT 시 자동 30 적립 (DEFAULT 30) — 별도 가입 트리거 불필요.
--   - 기존 user_usage row 들도 30 으로 초기화 (NOT NULL DEFAULT 30 의 backfill 효과).
--   - unlimited 는 운영자가 Supabase Studio 에서 SQL UPDATE 로 토글:
--       UPDATE user_usage SET unlimited = true
--         WHERE user_id = (SELECT id FROM auth.users WHERE email = 'galmagy82@gmail.com');
--
-- 기존 컬럼과의 관계:
--   - free_trial_count / subscribed 등 구독 모델 시절 컬럼은 그대로 유지 (코드 호환).
--     충전식 전환 후 의미 약해짐 — 향후 점진적 deprecated 검토.
-- ============================================================================

ALTER TABLE user_usage
  ADD COLUMN IF NOT EXISTS credit_balance integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS unlimited      boolean NOT NULL DEFAULT false;

-- 운영자가 unlimited 사용자 빠르게 조회하려는 인덱스 (소규모지만 유용)
CREATE INDEX IF NOT EXISTS user_usage_unlimited_idx
  ON user_usage (user_id)
  WHERE unlimited = true;
