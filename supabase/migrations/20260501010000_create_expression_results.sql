-- ============================================================================
-- expression_results 테이블 생성
-- ----------------------------------------------------------------------------
-- 목적: vocabulary 검색 중 "표현 모드" (Gemini 응답의 pos === '') 결과를
--       전역 캐시로 저장하여, 사용자 간 공유 hit 가능하게 함.
--
-- word_results 와의 차이:
--   - word_results 는 단어 단위(POS/CEFR/이미지) 캐시 — hit 조건 cefr 필수
--   - expression_results 는 문장·구절·idiom 캐시 — 텍스트만, 이미지 없음
--   - cache_key 는 lemma(있으면) 또는 surface 의 정규화 문자열
--     (lowercase + trim + 다중 공백 → single space). 같은 표현의 활용형 변형을
--     하나의 캐시 row 로 모음.
--
-- Reading 학습 단어 흐름의 활용:
--   reading-finalize 의 study_items 중 type=idiom/collocation 등은 보통
--   표현 모드로 분기되어 현재 캐시 안 됨 → 이 테이블이 그 사각지대를 메움.
--   책 본문 substring + lemma 로 정규화된 입력이라 hit 율 높음.
-- ============================================================================

CREATE TABLE IF NOT EXISTS expression_results (
  id          BIGSERIAL PRIMARY KEY,
  -- 정규화된 캐시 키 (lemma 우선, 없으면 surface — 둘 다 lowercase + trim + 공백 정규화)
  cache_key   TEXT NOT NULL,
  -- UI 언어 (ko/en/ja/zh/es/vi/th/pt) — 같은 표현이라도 풀이 언어가 다르면 별도 row
  lang        TEXT NOT NULL,
  -- 디버깅/추적용 원본 — 캐시 키 재생산 또는 데이터 품질 검증에 사용
  surface     TEXT,
  lemma       TEXT,
  corrected   TEXT,
  -- 표현 모드 텍스트 본문 (feeling 결과)
  description TEXT NOT NULL,
  -- 예문/풀이 블록 (🔑 블록 등을 \n 으로 join 한 문자열)
  examples    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- 같은 (캐시 키, 언어) 페어는 단일 row 로 강제 — 중복 저장 방지
  UNIQUE (cache_key, lang)
);

-- (cache_key, lang) 페어 단일 조회를 위한 인덱스 (UNIQUE 제약이 자동 생성하지만 명시)
CREATE INDEX IF NOT EXISTS expression_results_key_lang_idx
  ON expression_results (cache_key, lang);

-- RLS 활성화 + word_aliases 와 동일한 공개 읽기/쓰기 정책
-- (vocabulary 검색은 익명 사용자도 가능 + 결과는 자산 공유가 목적이므로 user_id 분리 안 함)
ALTER TABLE expression_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expression_results_select" ON expression_results
  FOR SELECT USING (true);

CREATE POLICY "expression_results_insert" ON expression_results
  FOR INSERT WITH CHECK (true);
