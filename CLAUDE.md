# 굿즈샵 프로젝트

## 개요
파스텔 톤의 굿즈 판매 정적 웹사이트.

- **호스팅**: GitHub Pages (`https://bighitcho.github.io/goods-shop/`)
- **백엔드**: Supabase (Auth + PostgreSQL + Edge Functions)
- **결제**: 토스 페이먼츠 테스트 모드
- **프론트엔드**: 순수 HTML / CSS / Vanilla JS (프레임워크 없음)

## 환경 변수 / 설정값

`js/config.js` 파일에서 관리:

| 상수 | 설명 | 위치 |
|------|------|------|
| `SUPABASE_URL` | `https://pnzykiqqfzvosbozpnkz.supabase.co` | 고정 |
| `SUPABASE_ANON_KEY` | Supabase 대시보드 → Settings → API → anon public | 입력 필요 |
| `TOSS_CLIENT_KEY` | 토스 대시보드 → 테스트 클라이언트 키 | 발급 후 입력 |

Supabase Edge Function 환경변수 (`supabase secrets set`으로 설정):

| 변수 | 설명 |
|------|------|
| `TOSS_SECRET_KEY` | 토스 테스트 시크릿 키 |

## 관리자 계정
- **이메일**: admin@admin.com
- **비밀번호**: superadmin
- `profiles.is_admin = true` 로 설정되어 있음

## 주요 페이지

| 파일 | 설명 |
|------|------|
| `index.html` | 상품 목록 + 장바구니 |
| `login.html` | 로그인 |
| `signup.html` | 회원가입 (이메일 인증 없음) |
| `checkout.html` | 토스 결제 위젯 |
| `my-orders.html` | 내 주문 내역 |
| `admin.html` | 전체 주문 관리 (관리자 전용) |
| `success.html` | 결제 성공 콜백 |
| `fail.html` | 결제 실패 콜백 |

## 개발 방법
1. `js/config.js`에 Supabase anon 키 입력
2. 파일을 브라우저에서 직접 열거나 로컬 서버로 실행
3. 토스 결제 테스트는 HTTPS 환경(GitHub Pages)에서만 정상 작동

## 배포
```bash
git add .
git commit -m "update"
git push origin main
```
GitHub Pages가 자동으로 배포됩니다.
