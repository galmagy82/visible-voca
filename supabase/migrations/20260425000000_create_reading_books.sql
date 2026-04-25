-- ============================================================================
-- reading_books 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: Reading Tutor 에서 추출한 책(영어 원문 + 번역 + 학습 단어) 데이터를
--       사용자가 저장하고 나중에 다시 불러올 수 있게 한다.
--
-- 설계 포인트:
--   - 저장 단위는 "책(업로드)" — 한 번에 올린 여러 페이지를 하나의 row 로 보관.
--   - pages 컬럼은 jsonb 배열로 페이지 단위 데이터를 모두 담음.
--     형식: [{ original, translated, no_text, study_items: [...] }]
--     별도 child 테이블을 두지 않는 이유: 한 책의 페이지는 항상 함께 조회/표시되며
--     단어 단위로 외부에서 join 할 일이 없음. 단순한 저장·조회 UX 에 jsonb 가 적합.
--   - title 은 사용자 입력 (Vocabulary 의 word_sets.name 과 같은 패턴).
--   - RLS: 본인 행만 SELECT/INSERT/UPDATE/DELETE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS reading_books (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  pages       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 사용자별 최근 책 조회용 인덱스 (목록 화면에서 created_at DESC 정렬)
CREATE INDEX IF NOT EXISTS reading_books_user_created_idx
  ON reading_books (user_id, created_at DESC);

ALTER TABLE reading_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reading_books_select_own"
  ON reading_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "reading_books_insert_own"
  ON reading_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reading_books_update_own"
  ON reading_books FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reading_books_delete_own"
  ON reading_books FOR DELETE
  USING (auth.uid() = user_id);
