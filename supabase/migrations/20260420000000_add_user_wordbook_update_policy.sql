-- ============================================================================
-- user_wordbook: UPDATE RLS 정책 추가
-- ----------------------------------------------------------------------------
-- 배경:
--   최초 생성(20260414010000_create_user_wordbook.sql) 시 SELECT/INSERT/DELETE
--   정책만 부여했으나, 클라이언트가 `.upsert(row, { onConflict: 'user_id,word' })`
--   로 호출하고 있음. PostgREST 의 upsert 는 내부적으로
--   `INSERT ... ON CONFLICT DO UPDATE` 로 번역되어 UPDATE 권한도 요구한다.
--   UPDATE 정책이 없으니 서버는 항상 403 을 반환, 클라이언트의 낙관적 UI 가
--   곧바로 롤백되어 "단어장에 추가됨 → 다시 추가" 깜박임이 발생했다.
--
-- 조치:
--   본인 row 에 한해 UPDATE 를 허용하는 정책 추가. 충돌 시 같은 사용자의
--   기존 row 를 최신 스냅샷으로 덮어쓰는 동작만 의도하며, 다른 사용자 row 는
--   WITH CHECK 로 차단된다.
-- ============================================================================

CREATE POLICY "user_wordbook_update_own"
  ON user_wordbook FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
