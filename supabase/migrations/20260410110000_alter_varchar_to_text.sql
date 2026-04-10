-- ============================================================================
-- word_results 테이블의 varchar 컬럼을 text로 변경
-- ----------------------------------------------------------------------------
-- 목적: 영어 설정에서 POS 등 값이 varchar(50) 제한을 초과하여
--       DB 저장이 실패하는 문제를 해결한다.
-- ============================================================================

ALTER TABLE word_results
  ALTER COLUMN pos TYPE text,
  ALTER COLUMN ipa TYPE text,
  ALTER COLUMN corrected TYPE text;
