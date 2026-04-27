-- word_results 테이블에 scene_en 컬럼 추가.
-- 목적: 이미지 생성에 사용된 영어 장면 묘사 1문장(텍스트 응답의 scene_en 필드)을
--       함께 저장하여, 이미지가 의도와 다르게 생성된 경우 사후 디버깅이 가능하도록 한다.
-- 흐름: Gemini 텍스트 응답(JSON) → scene_en 추출 → V6_IMAGE_PROMPT 에 전달 → 이미지 생성.
--       지금까지는 scene_en 이 메모리에서만 쓰이고 어디에도 영구 저장되지 않아
--       잘못된 이미지(예: "get off" 가 차에 타는 장면으로 생성)의 원인 추적이 불가능했다.
-- 기존 row 호환을 위해 NULL 허용.

ALTER TABLE word_results ADD COLUMN scene_en TEXT;
