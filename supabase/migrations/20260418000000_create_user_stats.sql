-- ============================================================================
-- user_stats 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: 사용자별 EXP·통계를 계정에 귀속하여 저장 (기기 간 동기화)
--
-- 설계 포인트:
--   - 유저당 1행, EXP·검색횟수·퀴즈정답수를 누적 저장.
--   - upsert(ON CONFLICT UPDATE)로 항상 최신값 유지.
--   - RLS: 본인 행만 SELECT / INSERT / UPDATE 가능.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_stats (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_exp        integer NOT NULL DEFAULT 0,
  stat_searches    integer NOT NULL DEFAULT 0,
  stat_quiz        integer NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_stats_select_own"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_stats_insert_own"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stats_update_own"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
