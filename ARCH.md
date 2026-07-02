# 아키텍처 문서

## 전체 구조

```
사용자 브라우저
    │
    ├── GitHub Pages (정적 HTML/CSS/JS)
    │       │
    │       ├── Supabase Auth    (회원가입/로그인)
    │       ├── Supabase DB      (상품, 주문 조회)
    │       └── Supabase Edge Fn (결제 확인)
    │                │
    │                └── 토스 페이먼츠 API
    │
    └── 토스 페이먼츠 결제 UI (팝업/리다이렉트)
```

## DB 스키마

### `profiles` (유저 프로필)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | auth.users.id 참조 |
| email | TEXT | 이메일 |
| name | TEXT | 이름 |
| is_admin | BOOLEAN | 관리자 여부 |
| created_at | TIMESTAMPTZ | 생성일 |

### `products` (상품)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| name | TEXT | 상품명 |
| description | TEXT | 설명 |
| price | INTEGER | 가격 (원) |
| image_url | TEXT | 이미지 URL |
| stock | INTEGER | 재고 |
| is_active | BOOLEAN | 판매 중 여부 |

### `orders` (주문)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | 구매자 |
| toss_order_id | TEXT UNIQUE | 토스 주문 ID |
| payment_key | TEXT | 토스 결제 키 (성공 후 저장) |
| amount | INTEGER | 결제 금액 |
| status | TEXT | pending/success/failed/cancelled |

### `order_items` (주문 상품)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| order_id | UUID FK | 주문 참조 |
| product_id | UUID FK | 상품 참조 |
| quantity | INTEGER | 수량 |
| price | INTEGER | 구매 시점 가격 스냅샷 |

## RLS 정책 요약

| 테이블 | 규칙 |
|--------|------|
| profiles | 자신의 행만 읽기/쓰기 |
| products | 전체 읽기 / admin만 수정 |
| orders | 자신의 주문 or admin 전체 |
| order_items | 자신의 주문 항목 or admin 전체 |

## 결제 흐름

```
1. index.html  → 상품 선택 → 장바구니(localStorage)
2. checkout.html → 토스 위젯 렌더 → 결제 클릭
3.   → createOrder() : DB orders INSERT (status=pending)
4.   → tossWidgets.requestPayment() : 토스 결제 UI
5. (결제 성공) → success.html?paymentKey=&orderId=&amount=
6.   → confirmPayment() : Edge Function 호출
7.   → Edge Fn → 토스 API confirm → DB status=success
8.   → clearCart() → 완료 화면
9. (결제 실패) → fail.html?code=&message=
10.  → DB status=failed
```

## JS 파일 역할

| 파일 | 역할 |
|------|------|
| `config.js` | 상수 (Supabase URL/Key, Toss Key) |
| `auth.js` | Supabase 클라이언트, 인증 함수, 네비게이션 렌더 |
| `products.js` | 상품 로드, 장바구니(localStorage), 토스트 |
| `payment.js` | 토스 위젯 초기화, 주문 생성, 결제 확인 |
| `orders.js` | 내 주문 목록 조회/렌더 |
| `admin.js` | 전체 주문 조회/렌더 (관리자) |

## Edge Function: confirm-payment

**경로**: `supabase/functions/confirm-payment/index.ts`

**요청**: `POST { paymentKey, orderId, amount }`

**처리 순서**:
1. 토스 API `/v1/payments/confirm` 호출 (시크릿 키 필요)
2. 성공 → `orders.status = 'success'`, `orders.payment_key` 저장
3. `decrement_stock` RPC로 재고 감소
4. 실패 → `orders.status = 'failed'`

**환경변수**:
- `TOSS_SECRET_KEY`: 토스 시크릿 키
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: 자동 주입
