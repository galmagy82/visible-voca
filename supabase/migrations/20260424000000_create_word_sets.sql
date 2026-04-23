-- ============================================================================
-- word_sets 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: 사진 검색 등에서 한꺼번에 추출한 여러 단어를 하나의 "학습 세트"로
--       묶어 단어장에서 세트 단위로 탐색·복습할 수 있게 한다.
--
-- 설계 포인트:
--   - 세트 이름(name) 은 사용자 입력 (자동 추천은 클라이언트가 생성: 날짜+소스).
--     중복 허용(같은 이름 여러 개 가능) — 제약 두지 않음.
--   - source 로 세트 생성 경로를 구분. 현재는 'photo' 만 사용.
--     향후 'quiz', 'manual' 등 확장 대비 text 로 유지.
--   - 단어 소속 관계는 user_wordbook.set_id 에서 참조
--     (다른 마이그레이션 파일에서 컬럼 추가).
--   - RLS: 본인 행만 SELECT/INSERT/UPDATE/DELETE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS word_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  source      text NOT NULL DEFAULT 'photo',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 사용자별 최근 세트 조회용 인덱스
CREATE INDEX IF NOT EXISTS word_sets_user_created_idx
  ON word_sets (user_id, created_at DESC);

ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "word_sets_select_own"
  ON word_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "word_sets_insert_own"
  ON word_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "word_sets_update_own"
  ON word_sets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "word_sets_delete_own"
  ON word_sets FOR DELETE
  USING (auth.uid() = user_id);
