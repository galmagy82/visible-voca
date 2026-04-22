-- ============================================================================
-- user_profile 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: 사용자별 프로필/설정 정보를 계정에 귀속하여 저장 (기기 간 동기화).
--       첫 필드는 ge_score (Renaissance STAR Reading Grade Equivalent).
--       사진 검색 AI 자동 추천 모드에서 사용자 수준에 맞는 단어를 고르기 위함.
--
-- 설계 포인트:
--   - 유저당 1행(user_id PK). 향후 목표/알림/프리미엄 등 프로필 계열 필드가 여기에 누적.
--   - user_stats(검색마다 write) 와 분리 — 프로필은 write 빈도 낮음 + 의미론적 분리.
--   - ge_updated_at 은 재입력 유도(예: 3개월 뒤 "다시 측정하셨나요?" 알림) 용도.
--   - RLS: 본인 행만 SELECT / INSERT / UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ge_score        numeric(4,1),              -- 예: 5.2, 12.8. NULL = 미입력
  ge_updated_at   timestamptz,               -- GE 마지막 입력/갱신 시각
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profile_select_own"
  ON user_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_profile_insert_own"
  ON user_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profile_update_own"
  ON user_profile FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
