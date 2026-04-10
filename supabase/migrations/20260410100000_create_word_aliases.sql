-- ============================================================================
-- word_aliases 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: 오타 → 정답 단어 매핑을 저장하여,
--       같은 오타 재입력 시 API 호출 없이 DB 캐시 히트를 가능하게 한다.
-- 예시: "pracitce" → "practice"
-- ============================================================================

CREATE TABLE IF NOT EXISTS word_aliases (
  typo       TEXT PRIMARY KEY,        -- 사용자가 입력한 오타 (소문자)
  corrected  TEXT NOT NULL,           -- Gemini가 교정한 정답 단어 (소문자)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화 및 공개 읽기/쓰기 정책
ALTER TABLE word_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "word_aliases_select" ON word_aliases
  FOR SELECT USING (true);

CREATE POLICY "word_aliases_insert" ON word_aliases
  FOR INSERT WITH CHECK (true);
