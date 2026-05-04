-- ============================================================================
-- credit_transactions 테이블 생성 (크레딧 거래 이력)
-- ----------------------------------------------------------------------------
-- 목적:
--   사용자별 크레딧 거래 이력을 남겨 추후 환불·문의 대응, 사용 패턴 분석,
--   결제 webhook 멱등성 보장에 사용.
--
-- 컬럼:
--   - type: 거래 종류
--       · signup_bonus: 신규 가입 30 크레딧 (별도 RPC 또는 트리거)
--       · charge:       사용자가 결제로 충전한 크레딧
--       · consume:      Reading 페이지 분석 등에서 차감된 크레딧 (음수 amount)
--       · refund:       환불 (운영자 수동 처리)
--       · admin_adjust: 운영자가 수동 조정 (보너스 지급, 보상 등)
--   - amount: 양수(적립) / 음수(차감). 부호로 방향 구분 — type 과 함께 보면 의도 명확.
--   - balance_after: 거래 직후 잔액 스냅샷. 정합성 검증·디버깅용 (UPDATE 와 INSERT 사이
--     race condition 발생 시 추적). RPC 가 lock 잡고 UPDATE-INSERT 한 트랜잭션으로 처리.
--   - payment_key / order_id: 토스페이먼츠 paymentKey, orderId. charge 거래에서만 채움.
--     같은 paymentKey 가 두 번 들어오면 webhook 중복 호출이라 무시되어야 — UNIQUE 제약.
--   - description: 사용자에게 표시할 라벨 ("사진 1장 분석", "5천원 충전 (100 크레딧)") 또는
--     운영자 메모.
--
-- RLS:
--   - SELECT: 본인 user_id 거래만 조회 가능
--   - INSERT/UPDATE/DELETE: 클라이언트 차단 → SECURITY DEFINER RPC (다음 마이그레이션) 로만 변경
--
-- 인덱스:
--   - (user_id, created_at DESC): 본인 거래 최근순 조회 (잔액 페이지)
--   - payment_key UNIQUE (NULL 제외): 결제 webhook 중복 호출 방지
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null check (type in ('signup_bonus', 'charge', 'consume', 'refund', 'admin_adjust')),
  amount          integer not null,
  balance_after   integer not null,
  payment_key     text,
  order_id        text,
  description     text,
  created_at      timestamptz not null default now()
);

-- 본인 거래 최근순 조회용
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_created_idx
  ON credit_transactions(user_id, created_at DESC);

-- 토스페이먼츠 webhook 중복 호출 방지 (charge 거래에서만 payment_key 채움)
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_payment_key_idx
  ON credit_transactions(payment_key)
  WHERE payment_key IS NOT NULL;

-- RLS 활성화
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 본인 거래만 SELECT 가능
CREATE POLICY "credit_transactions_select_own"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE 정책 정의 X → 기본 거부
-- → 변경은 SECURITY DEFINER RPC (다음 마이그레이션) 로만 가능
