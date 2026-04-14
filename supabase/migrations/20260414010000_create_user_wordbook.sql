-- ============================================================================
-- user_wordbook 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: 사용자별 단어장을 계정 기반으로 저장 (기존 IndexedDB 로컬 저장 대체)
--
-- 설계 포인트:
--   - 단어장은 "추가 시점의 결과 스냅샷"을 구조화된 필드로 저장한다.
--   - 이유 1: word_results 캐시에는 POS(품사)가 있는 단어만 저장되므로,
--            품사 없는 문장/구절은 word_results 에 없음 → 기기 전환 시 복원 불가.
--            단어장에 직접 텍스트 필드를 보관하면 원본 결과를 그대로 복원 가능.
--   - 이유 2: 구조화된 필드(description, examples 등)로 저장하면
--            향후 UI/언어 전환·검색·학습 기능 확장 시 재조립이 자유롭다.
--   - 이미지(image_path)는 이 테이블에 저장하지 않는다. 이미지는 word_results
--     에 공용으로 저장되어 있으므로 단어장 상세 표시 시 fetchExistingImage()
--     로 조회하여 재사용한다(POS 없는 항목은 이미지도 없으므로 자연히 생략).
--
-- RLS: 본인 row 만 SELECT/INSERT/DELETE 가능.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_wordbook (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word        text NOT NULL,
  pos         text DEFAULT '',
  ipa         text DEFAULT '',
  cefr        text DEFAULT '',
  corrected   text DEFAULT '',
  description text DEFAULT '',
  examples    text DEFAULT '',
  added_at    timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, word)
);

-- 사용자별 최근 추가 순 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS user_wordbook_user_added_idx
  ON user_wordbook (user_id, added_at DESC);

ALTER TABLE user_wordbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_wordbook_select_own"
  ON user_wordbook FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_wordbook_insert_own"
  ON user_wordbook FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_wordbook_delete_own"
  ON user_wordbook FOR DELETE
  USING (auth.uid() = user_id);
