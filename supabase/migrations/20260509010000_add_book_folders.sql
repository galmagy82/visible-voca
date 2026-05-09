-- ============================================================================
-- book_folders 테이블 + reading_books.folder_id 추가
-- ----------------------------------------------------------------------------
-- 배경:
--   사용자가 챕터별로 사진을 업로드하면 reading_books 에 row 가 빠르게 누적되어
--   My Books 화면에서 책 식별·관리가 어려워짐 (2026-05-09 결정).
--   각 챕터를 별도 책으로 유지하되 (챕터별 학습 진입 빠름), 폴더 단위로 묶어
--   화면에서 시각 정리.
--
-- 데이터 모델:
--   - book_folders(id uuid, user_id uuid, name text, created_at)
--   - reading_books.folder_id uuid → book_folders(id) ON DELETE SET NULL
--   - 책은 0..1 폴더에만 속함 (다중 분류 미지원, 단순함 우선)
--
-- 영향:
--   - 기존 reading_books 모든 row: folder_id = NULL (폴더 없는 책으로 표시)
--   - 기존 사용자 화면 흐름: 영향 0 — 폴더 만들기 전엔 그대로
--
-- 정책:
--   - book_folders RLS: 본인 폴더만 SELECT/INSERT/UPDATE/DELETE
--   - reading_books 기존 RLS 가 folder_id 컬럼도 자동 보호
--
-- 작업 흐름 (step 1 = 이 마이그레이션):
--   step 2: 업로드 저장 화면에 책 이름 + 폴더 선택 입력 추가
--   step 3: My Books 폴더 카드 + 만들기·삭제 + 책 → 폴더 이동
--   step 4: 폴더 진입 화면, 다중 선택 일괄 이동, 이름 변경
-- ============================================================================

-- 1) book_folders 테이블 ------------------------------------------------------
CREATE TABLE IF NOT EXISTS book_folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS book_folders_user_id_idx ON book_folders(user_id);

-- 2) RLS — 본인 폴더만 접근 ---------------------------------------------------
ALTER TABLE book_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_folders_owner_select" ON book_folders;
DROP POLICY IF EXISTS "book_folders_owner_insert" ON book_folders;
DROP POLICY IF EXISTS "book_folders_owner_update" ON book_folders;
DROP POLICY IF EXISTS "book_folders_owner_delete" ON book_folders;

CREATE POLICY "book_folders_owner_select" ON book_folders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "book_folders_owner_insert" ON book_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "book_folders_owner_update" ON book_folders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "book_folders_owner_delete" ON book_folders
  FOR DELETE USING (auth.uid() = user_id);

-- 3) reading_books 에 folder_id 추가 -----------------------------------------
-- ON DELETE SET NULL: 폴더 삭제 시 책은 폴더 없음으로 유지 (책 본문은 보존)
ALTER TABLE reading_books
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES book_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reading_books_folder_id_idx ON reading_books(folder_id);
