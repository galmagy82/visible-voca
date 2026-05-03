-- ============================================================================
-- increment_upvote(row_id) / increment_downvote(row_id) RPC 함수 추가
-- ----------------------------------------------------------------------------
-- 목적:
--   word_results 의 anon UPDATE 가 RLS 로 차단되어 있어 클라이언트가
--   upvote_count / downvote_count 를 직접 올릴 수 없음.
--   기존 increment_hit_count 와 동일한 패턴으로, SECURITY DEFINER 함수가
--   RLS 를 우회하되 "카운트 1 증가" 외엔 아무것도 못 하도록 범위를 제한한다.
--
-- 동작:
--   - 인자 row_id 로 식별되는 word_results row 의 해당 카운트를 1 증가
--   - 단일 SQL 문이라 atomic — 동시 호출 시 race condition 없음
--   - 다른 컬럼은 절대 수정 불가 (함수 본문에 그렇게 짜여있음)
--
-- 권한:
--   - public 의 모든 권한 회수 후 anon, authenticated 에만 EXECUTE 부여
--   - 익명 사용자도 supabase.rpc('increment_upvote', { row_id }) 호출 가능
--
-- 보안 / 어뷰즈 고려:
--   - row_id 임의 값으로 다른 row 카운트 부풀리기 가능. 단 자동 무효화 정책이
--     없으므로 운영자 모니터링 단계에서 의심스러운 패턴은 수동 판단으로 거름.
--   - 한 사용자가 같은 row 에 무한 클릭 가능 — UI 측에서 1회 클릭 후 비활성화
--     처리 권장 (DB 레벨 제한이 필요해지면 votes 테이블로 확장).
--   - Supabase 기본 rate limit 으로 일차 방어.
--
-- 향후 확장 가능성:
--   - 사용자별 1표 제한이 필요해지면 (word_id, user_id, vote) 형태의 별도
--     votes 테이블을 만들고 이 RPC 들을 거기에 INSERT … ON CONFLICT 하도록 변경.
--     현재는 단순 카운트만 있으면 충분하다는 전제.
-- ============================================================================

-- 추천 카운트 +1
create or replace function increment_upvote(row_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update word_results
  set upvote_count = upvote_count + 1
  where id = row_id;
$$;

-- 비추천 카운트 +1
create or replace function increment_downvote(row_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update word_results
  set downvote_count = downvote_count + 1
  where id = row_id;
$$;

-- 기본 권한 회수 후 anon / authenticated 에만 실행 권한 부여
revoke all on function increment_upvote(bigint)   from public;
revoke all on function increment_downvote(bigint) from public;
grant execute on function increment_upvote(bigint)   to anon, authenticated;
grant execute on function increment_downvote(bigint) to anon, authenticated;
