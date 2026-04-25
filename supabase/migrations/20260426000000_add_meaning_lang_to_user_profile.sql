-- ============================================================================
-- user_profile.meaning_lang 컬럼 추가
-- ----------------------------------------------------------------------------
-- 목적: Reading Tutor 의 학습 단어 카드에서 "뜻"을 어떤 언어로 표시할지 선택.
--       'native' = UI 언어(모국어)로 표시 (기본값)
--       'en'     = 영영 풀이 (학습자가 영어 정의를 선호하는 경우)
--
-- 배경:
--   - 기존 동작은 항상 UI 언어로 뜻을 받음 (예: 한국어 UI → "복제 인간").
--   - 일부 학습자(특히 GE 8+) 는 영영 정의를 선호 — "영어로 사고하는 훈련" 측면에서 유리.
--   - 페이지마다 토글하기보다 계정 전역 설정으로 한 번 정해두는 편이 UX 가 깔끔하다는 판단.
--
-- 설계:
--   - 기본값 'native' — 기존 사용자 행은 자동으로 모국어 모드 (행동 변경 없음).
--   - 향후 더 세분화 (예: 단순 뜻 vs 자세한 정의) 가 필요하면 별도 컬럼 추가로 확장.
-- ============================================================================

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS meaning_lang text NOT NULL DEFAULT 'native';

-- 가능한 값을 'native' / 'en' 으로 제한 (오타·버그로 잘못된 값이 들어가지 않도록)
ALTER TABLE user_profile
  DROP CONSTRAINT IF EXISTS user_profile_meaning_lang_check;
ALTER TABLE user_profile
  ADD CONSTRAINT user_profile_meaning_lang_check
  CHECK (meaning_lang IN ('native', 'en'));
