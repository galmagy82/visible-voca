-- ============================================================================
-- word_results + user_wordbook 에 verb_forms 컬럼 추가
-- ----------------------------------------------------------------------------
-- 목적: 동사의 3단변화(현재-과거-과거분사)를 저장하여 검색 결과와
--       단어장 상세에서 표시할 수 있도록 한다.
--
-- 저장 포맷:
--   "present | past | past_participle"  (파이프 구분, 공백 허용)
--   예) "go | went | gone"
--
-- 동사가 아닌 단어(명사/형용사/부사/구절 등)는 빈 문자열('') 을 그대로 저장한다.
-- Gemini 텍스트 응답에서 [VERB_FORMS: ...] 태그를 파싱해 채운다.
-- ============================================================================

ALTER TABLE word_results
  ADD COLUMN IF NOT EXISTS verb_forms text DEFAULT '';

ALTER TABLE user_wordbook
  ADD COLUMN IF NOT EXISTS verb_forms text DEFAULT '';
