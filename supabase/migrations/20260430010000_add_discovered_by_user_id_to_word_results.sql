-- ============================================================================
-- word_results 테이블에 discovered_by_user_id (UUID) 컬럼 추가
-- ----------------------------------------------------------------------------
-- 목적: 단어를 최초 발견한 사용자를 UUID 로도 기록 → auth.users / user_usage
--       와 join 가능. 기존 discovered_by (이메일 local-part TEXT) 컬럼은
--       유지하되, UUID 가 분석/쿼리용 정식 키.
--
-- - 백필 없음: 기존 row 의 discovered_by(local-part) 로 UUID 를 추정하면
--   동일 local-part 다른 도메인 사용자 충돌 위험. 신규 row 부터 UUID 채움.
-- - FK: auth.users(id) 참조 — 사용자 삭제 시 RESTRICT 가 default 라 안전.
-- ============================================================================

ALTER TABLE word_results
  ADD COLUMN IF NOT EXISTS discovered_by_user_id UUID REFERENCES auth.users(id);

-- 분석 쿼리 (특정 사용자가 발견한 단어 목록 등) 성능 확보
CREATE INDEX IF NOT EXISTS word_results_discovered_by_user_id_idx
  ON word_results (discovered_by_user_id);
