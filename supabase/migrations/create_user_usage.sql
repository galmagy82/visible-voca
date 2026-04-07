/* 사용량 추적 테이블 */
CREATE TABLE IF NOT EXISTS user_usage (
  user_id TEXT PRIMARY KEY,
  search_count INTEGER DEFAULT 0,
  subscribed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/* updated_at 자동 갱신 트리거 */
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_usage_updated_at
  BEFORE UPDATE ON user_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

/* RLS 활성화 — Edge Function은 service_role 키로 접근하므로 RLS 우회 */
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
