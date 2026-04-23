-- ============================================================================
-- user_wordbook 에 set_id 컬럼 추가
-- ----------------------------------------------------------------------------
-- 목적: 단어를 word_sets 로 그룹핑할 수 있게 한다.
--       사진 검색에서 "세트로 저장" 으로 한번에 저장된 단어들에 동일한 set_id 부여.
--
-- 설계 포인트:
--   - NULLABLE — 세트에 소속되지 않은 낱개 단어(기존 개별 추가)도 그대로 허용.
--   - ON DELETE SET NULL — 세트 삭제 시 단어는 남기고 set_id 만 NULL 로.
--     (단어 자체를 잃지 않도록 CASCADE 대신 SET NULL 선택)
--   - 기존 인덱스(user_wordbook_user_added_idx)는 그대로 사용.
--   - 추가 인덱스: 세트별 단어 조회용 (세트 상세 뷰에서 set_id 필터링).
-- ============================================================================

ALTER TABLE user_wordbook
  ADD COLUMN IF NOT EXISTS set_id uuid
    REFERENCES word_sets(id) ON DELETE SET NULL;

-- 세트별 단어 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS user_wordbook_user_set_idx
  ON user_wordbook (user_id, set_id)
  WHERE set_id IS NOT NULL;
