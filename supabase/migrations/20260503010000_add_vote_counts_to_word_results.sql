-- ============================================================================
-- word_results 테이블에 추천/비추천 카운트 컬럼 추가
-- ----------------------------------------------------------------------------
-- 목적:
--   검색 결과 화면(텍스트 + 이미지 + 예문) 에 대한 사용자 피드백 수집.
--   비추천이 많은 row 는 모니터링 후 수동으로 캐시 삭제 → 다음 검색 시 재생성.
--
-- 정책 (현 시점):
--   - 자동 무효화 없음. 운영자가 DB 에서 비추천 많은 row 를 직접 확인 후 삭제.
--   - 사용자별 1표 제한 같은 자동 어뷰즈 방어 없음 — 자동 무효화가 없으니
--     어뷰즈 동기 자체가 약함. 필요 시 별도 votes 테이블로 확장 가능.
--   - 비추천 사유는 기록하지 않음 (UI 단순화). 대부분 그림에 대한 불만이라는
--     가정 하에, 모니터링 후 이미지만 재생성하는 운영 패턴 상정.
--
-- 카운트 동작:
--   - 단순 카운트 컬럼. 클라이언트는 increment_upvote / increment_downvote
--     RPC 함수(다음 마이그레이션) 로만 증가 가능.
--   - DEFAULT 0 NOT NULL → 기존 row 들은 자동으로 0 으로 채워짐.
--
-- 인덱스:
--   - downvote_count > 0 인 row 만 부분 인덱스로 추적.
--     모니터링 쿼리(ORDER BY downvote_count DESC LIMIT N) 성능 확보 + 인덱스 크기 최소화.
--   - upvote_count 는 운영상 정렬 필요성 낮아 인덱스 생략. 필요해지면 추가.
-- ============================================================================

ALTER TABLE word_results
  ADD COLUMN IF NOT EXISTS upvote_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count integer NOT NULL DEFAULT 0;

-- 비추천 모니터링용 부분 인덱스 (downvote 가 있는 row 만)
CREATE INDEX IF NOT EXISTS word_results_downvote_idx
  ON word_results (downvote_count DESC)
  WHERE downvote_count > 0;
