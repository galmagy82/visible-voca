-- ============================================================================
-- user_usage 테이블의 free_trial_count → trial_count 컬럼명 변경
-- ============================================================================

ALTER TABLE user_usage
  RENAME COLUMN free_trial_count TO trial_count;
