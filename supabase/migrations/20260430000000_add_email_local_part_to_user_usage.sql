-- ============================================================================
-- user_usage 테이블에 email_local_part 컬럼 추가
-- ----------------------------------------------------------------------------
-- 목적: DB Studio 에서 user_id (UUID) 만 보면 누구인지 식별이 어려우므로
--       이메일 local-part (@ 앞 부분) 를 denormalized 캐시로 함께 저장.
--       사람용 식별 라벨이며, join/분석 키로는 user_id 를 사용해야 함.
--
-- - 기존 row 백필: UUID 1:1 매핑이라 안전하게 일괄 수행.
-- - 신규 row INSERT 시: BEFORE INSERT 트리거로 자동 채움 → 앱/Edge Function
--   코드 변경 불필요.
-- - SECURITY DEFINER: 트리거가 auth.users 를 읽어야 하는데 일반 권한으로는
--   접근 불가하므로 함수 소유자(보통 supabase admin) 권한으로 실행.
-- ============================================================================

ALTER TABLE user_usage
  ADD COLUMN IF NOT EXISTS email_local_part TEXT;

-- 기존 row 백필 — user_usage.user_id (TEXT) 와 auth.users.id (UUID) 매칭
UPDATE user_usage uu
SET email_local_part = SPLIT_PART(u.email, '@', 1)
FROM auth.users u
WHERE u.id::text = uu.user_id
  AND uu.email_local_part IS NULL;

-- 신규 INSERT 자동 채움 트리거 함수
CREATE OR REPLACE FUNCTION fill_user_usage_email_local_part()
RETURNS TRIGGER AS $$
BEGIN
  -- 이미 값이 있으면(드물게 명시 전달된 경우) 그대로 유지
  IF NEW.email_local_part IS NULL THEN
    SELECT SPLIT_PART(email, '@', 1) INTO NEW.email_local_part
    FROM auth.users
    WHERE id::text = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 동일 트리거 재생성 안전을 위해 DROP 선행
DROP TRIGGER IF EXISTS set_user_usage_email_local_part ON user_usage;

CREATE TRIGGER set_user_usage_email_local_part
  BEFORE INSERT ON user_usage
  FOR EACH ROW
  EXECUTE FUNCTION fill_user_usage_email_local_part();
