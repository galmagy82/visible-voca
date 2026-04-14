-- ============================================================================
-- word_translations 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: 비영어 입력 → 영어 번역 매핑 저장 (기존 word_aliases 는 오타 교정 전용)
--
-- word_aliases 와 분리 이유:
--   - word_aliases: 오타 교정 (예: "aple" → "apple")
--   - word_translations: 비영어 번역 (예: "사과" → "apple", lang='ko')
--   역할이 다르므로 테이블을 분리하여 향후 target language 기능 도입 시 활용.
--
-- 소스 언어는 Gemini 응답의 [SOURCE_LANG: xx] 태그로부터 획득한다.
-- 태그가 있으면 번역, 없으면 오타 교정으로 간주한다.
-- ============================================================================

CREATE TABLE IF NOT EXISTS word_translations (
  source_word text PRIMARY KEY,
  lang        text NOT NULL,
  english_word text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- english_word 기준 역조회를 위한 인덱스 (선택)
CREATE INDEX IF NOT EXISTS word_translations_english_idx
  ON word_translations (english_word);

-- RLS 정책 (word_aliases 와 동일: 모든 사용자 읽기/쓰기 허용)
ALTER TABLE word_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "word_translations_select_all"
  ON word_translations FOR SELECT
  USING (true);

CREATE POLICY "word_translations_insert_all"
  ON word_translations FOR INSERT
  WITH CHECK (true);
