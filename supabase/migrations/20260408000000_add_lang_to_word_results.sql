-- ============================================================================
-- word_results 테이블에 lang 컬럼 추가
-- ----------------------------------------------------------------------------
-- 목적: 같은 단어라도 사용자 언어 설정(ko/en)에 따라 다른 결과를 캐싱하기 위함.
--       기존에는 lang 컬럼이 없어 영어로 검색해 저장된 row가 한글 사용자에게
--       그대로 반환되는 언어 불일치 버그가 있었음.
--
-- 기존 row 처리 정책:
--   - lang 컬럼은 NULL 허용. 기존 row는 모두 NULL 상태로 남는다.
--   - 클라이언트(fetchFromSupabase)는 .eq('lang', getLang()) 필터를 사용하므로
--     NULL row는 자연히 매칭에서 제외되어 폐기된다.
--   - 새로운 검색이 진행되면 현재 언어 값이 채워진 row가 새로 쌓인다.
-- ============================================================================

ALTER TABLE word_results
  ADD COLUMN IF NOT EXISTS lang text;

-- (word, lang) 조회 성능을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS word_results_word_lang_idx
  ON word_results (word, lang);
