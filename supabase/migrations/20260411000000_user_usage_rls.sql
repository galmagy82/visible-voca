-- ============================================================================
-- user_usage 테이블 RLS 정책
-- ----------------------------------------------------------------------------
-- 목적: 클라이언트에서는 본인 데이터 조회만 허용하고,
--       사용량 변경은 Edge Function(service_role)에서만 가능하도록 제한한다.
-- ============================================================================

-- RLS 활성화
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 조회 허용
CREATE POLICY "user_usage_select_own"
  ON user_usage FOR SELECT
  USING (auth.uid()::text = user_id);
