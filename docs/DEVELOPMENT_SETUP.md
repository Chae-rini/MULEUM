# 로컬 실행과 데이터베이스 검증

## 웹앱

```bash
cd /Users/kimchaerin/Downloads/muleum-codex-starter
npm run dev -- --hostname 127.0.0.1
```

공개 `/`, 회원 `/app`, 프로필 `/app/profile`, 등록 시연 `/app/register`, 관계 관리 `/app/accounts`, 영상 `/app/videos`. 역할 선택에서 학생·선생님·관리자로 바꾸고 복습 자료실 메뉴를 선택한다. 가상 데이터는 example.invalid 이메일과 DEMO Video ID를 사용한다. 새 프로필·관계·영상 데이터는 새로고침하면 초기화한다. 기존 질문·일기·목표 저장 키는 유지한다.

## 자동 검사

```bash
npm run test
npm run test:e2e
npm run build
npm run typecheck
```

Playwright는 설치된 Google Chrome을 독립 프로필로 실행한다. 세 화면 크기의 브라우저 검사는 실제 iOS/Safari 검증을 대체하지 않는다.

## 운영 DB 없는 SQL 검사

현재 Supabase CLI·psql은 설치되어 있지 않고 Docker 엔진은 실행 중이 아니다. 대안으로 임시 폴더에 PGlite 0.5.11을 설치했다. 앱 package.json/lockfile에는 추가하지 않았다.

```bash
npm install --prefix /private/tmp/muleum-sql-check --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.5.11
node scripts/test-database.mjs /private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js
```

이 스크립트는 인메모리 PostgreSQL을 새로 만들고 마이그레이션·가상 seed·실제 SQL을 실행한 뒤 닫는다. DATABASE_URL이나 운영 인증정보는 읽지 않는다. `auth.users`와 `auth.uid()`만 테스트용 최소 구현으로 대체하고 anon/authenticated DB 역할로 권한을 검사한다. RLS를 JS 조건문으로 흉내내는 테스트가 아니다.

범위 밖: Supabase Auth 토큰·REST·RPC HTTP 경로, 관리형 환경의 기본 권한·확장, 다중 DB 연결 동시성, 실제 YouTube 초대·시청·회수. 이 검사가 통과해도 실제 학생 데이터를 사용할 수 있다는 뜻은 아니다.

## 향후 Supabase 개발 환경 연결 순서

1. 별도 로컬 Supabase 환경을 준비하고 프로젝트가 로컬인지 확인한다. 운영 프로젝트에 현재 마이그레이션·seed를 실행하지 않는다.
2. `supabase/migrations/202610230001_members_and_videos.sql`을 검토한 뒤 개발 DB에 적용한다. `supabase/seed.sql`은 테스트용 auth.users 최소 행을 생성하므로 실제 Auth 가입 방식이 아니며 운영에는 사용하지 않는다.
3. Google 단일 로그인 체계를 구성한다. Supabase의 새 사용자 가입(`enable_signup`)은 **켜 둔다**. 초대받은 회원도 첫 구글 로그인 때 Auth 사용자가 새로 생기기 때문이다. 이메일 가입은 끈다. 회원 행 생성·활성화는 초대 수락·첫 로그인 확인·보호자 동의 DB 함수로만 하고, 초대가 없는 계정은 앱의 콜백이 거절하고 세션을 폐기한다.
4. 현재는 추가 패키지 없이 공식 Auth/REST API와 서버 쿠키로 로그인 코드를 준비했다. 아래 로그인 설정 절차를 따른다. 자동 세션 갱신·추가 로그인 방식이 필요하면 공식 SDK 도입을 별도 검토한다. publishable key는 공개 가능한 키지만 service role/secret은 서버 전용이며 NEXT_PUBLIC_ 변수나 번들에 넣지 않는다. 일반 요청에 RLS 우회용 관리자 클라이언트를 쓰지 않는다.
5. 로그인 세션에서 DB 함수 호출자의 ID를 얻는다. 현재 데모의 역할 선택·actor 인자는 인증 근거로 사용하지 않는다. 실제 프로필을 데모 컨텍스트에 적재하지 않는다.
6. 직접 REST/SQL/RPC 요청, 탈퇴·철회, 부모 다대다 관계, 미성년자, 관리자 경계, 10번째/100번째 동시 승인과 재시도 검사를 반복한다.
7. 공식 채널 소유 확인·개인정보 정책·필요한 보호자 동의·보유기간·보안 검증을 마친 후 별도 승인으로 베타를 연다.

SQL 스키마는 새 개발 DB 기준이며 기존 DB에 반복 적용하는 스크립트가 아니다. 연결·배포·비밀키 생성·실제 이메일 전송은 이번 작업에서 실행하지 않았다.

## 로컬 Supabase (Docker)

클라우드 프로젝트 없이 Docker 위에서 Supabase를 실행한다. 비용은 들지 않고, 무료 클라우드 플랜처럼 일시 정지되지도 않는다. 이 DB는 내 컴퓨터에만 있으며 베타용 클라우드 프로젝트와 완전히 별개다.

```bash
open -a Docker                          # Docker Desktop 실행
brew install supabase/tap/supabase      # 최초 1회
cd /Users/kimchaerin/Downloads/muleum-codex-starter
supabase start                          # 첫 실행은 이미지 다운로드로 수 분
supabase status                         # 주소 확인
supabase stop                           # 쓰지 않을 때. 데이터는 유지된다
```

- `supabase/config.toml`(2026-10-24 `supabase init`)
  - seed는 끈다. `seed.sql`에는 PGlite 검사용 가상 관리자가 있어서, 켜 두면 첫 관리자 지정이 막힌다.
  - 이메일 가입은 끄고 새 사용자 가입은 켠다.
  - 돌아올 주소는 `http://127.0.0.1:3000/auth/callback`이다.
  - 앱이 쓰지 않는 realtime·storage·edge functions·analytics·메일 테스트 서버는 끈다.
- `supabase start`가 `supabase/migrations`를 순서대로 적용한다. 2026-10-24 Postgres 17(supabase/postgres 17.11)에서 4개 모두 오류 없이 적용됐다. 확인한 내용은 다음과 같다.
  - public 테이블 23개 모두 RLS가 켜져 있다.
  - 익명 요청은 테이블 조회와 RPC 모두 401(42501)로 막힌다.
  - 첫 관리자 SQL을 트랜잭션 안에서 리허설하고 롤백했다. 지정 후 `my_onboarding_status() = active`였고 학부모 초대 생성도 성공했다.
- 주소: API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`, DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- `.env.local`에는 로컬 주소와 로컬 publishable key를 넣는다. 이 키는 CLI 기본 개발 값이다. `MULEUM_ENABLE_AUTH=true`로 바꾸면 체험 로그인이 사라지고, 체험 로그인을 전제로 한 Playwright 검사가 실패한다. 검사 전에는 `false`로 돌린다.
- 구글 로그인을 하려면 Google OAuth 클라이언트가 필요하다. 리디렉션 URI는 `http://127.0.0.1:54321/auth/v1/callback`이다(`localhost`와 혼용 불가). 클라이언트 ID·secret은 **프로젝트 최상위 `.env`**에 `GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET`으로 넣는다. `config.toml`의 `env()`는 `supabase/` 안이 아니라 최상위 `.env`를 읽는다([Managing config](https://supabase.com/docs/guides/local-development/managing-config)). 같은 파일에 첫 관리자 정보(`MULEUM_ADMIN_EMAIL`·`_NAME`·`_BIRTH_DATE`·`_REGION`·`_ALSO_TEACHER`)도 적는다. `.gitignore`의 `.env*`가 이 파일을 커밋에서 제외한다. Next.js도 최상위 `.env`를 읽지만 앱 코드는 이 값들을 쓰지 않는다. `SUPABASE_`로 시작하는 변수 이름은 CLI가 무시한다는 보고가 있다. 그다음 `config.toml`의 `[auth.external.google]`을 켜고 `supabase stop && supabase start`로 재시작한다.

## 로그인과 마이페이지 — 추가 구현

`/login`에서 학생·학부모 가상 계정을 선택하면 `/member/[role]`로 이동한다. `/mypage`는 해당 계정의 기본 정보와 승인 역할을 보여준다. 비로그인은 로그인 화면으로 보내고, 다른 역할 주소는 서버에서 차단한다. 로그아웃과 새로고침 후 세션 유지가 동작한다.

`/app`는 기존 기능을 보존한 독립 시연이다. 로그인 계정의 학습 기록으로 취급하거나 자동 이동하지 않는다. 실제 인증된 학생·선생님의 회원 홈에는 `/member/questions`로 연결하는 버튼이 있다. 질문 이외의 학습 기능은 연결 준비 중으로 표시한다. 졸업생 커뮤니티 메뉴는 없으며 기존 `/app/community` 주소는 `/mypage`로 연결한다.

가상 로그인은 `npm run dev`에서만 제공한다. 임의 역할을 선택할 수 있는 체험이므로 실제 회원 인증이 아니다. 쿠키는 HttpOnly·SameSite=Lax·1시간이며 개발 서버를 다시 시작하면 가상 세션이 만료될 수 있다. 프로덕션 및 실제 인증 설정 모드에서는 가상 로그인과 쿠키를 인정하지 않는다.

### Supabase 개발 환경 설정

이번 작업은 설정 파일·비밀키·운영 DB를 변경하지 않았다. 외부 프로젝트 연결 승인 후 개발 환경에 다음 변수를 설정한다. 값을 채팅·Git·스크린샷에 올리지 않는다.

```dotenv
MULEUM_ENABLE_AUTH=true
MULEUM_SITE_URL=http://127.0.0.1:3000
SUPABASE_URL=https://YOUR_DEVELOPMENT_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_DEVELOPMENT_KEY
```

`MULEUM_SITE_URL`은 구글 로그인 후 돌아올 주소의 기준이다. 요청의 Host 헤더를 믿지 않기 위해 설정값만 쓴다. 배포 시 실제 사이트 주소(https)로 바꾼다.

### 초대 링크 + Google 로그인 설정 (2026-10-24 결정, 외부 작업은 직접 진행)

가입 양식은 없다. 관리자가 만든 1회용 초대 링크를 **초대받은 구글 계정**으로 열어 로그인하면 가입되고, 첫 로그인 때 이름·생년월일·시군구·개인정보 동의를 한 번 확인한다. 만 15세 미만은 가입할 수 없고, 만 19세 미만은 관리자가 보호자 동의를 기록할 때까지 "동의 대기"다.

1. Google Cloud Console에서 OAuth 동의 화면과 "웹 애플리케이션" OAuth 클라이언트를 만든다. 승인된 리디렉션 URI에 `https://YOUR_DEVELOPMENT_PROJECT.supabase.co/auth/v1/callback`을 넣는다.
2. Supabase → Authentication → Providers에서 Google을 켜고 클라이언트 ID·secret을 입력한다. Google secret은 Supabase에만 두고 이 레포·환경 파일에 넣지 않는다.
3. Supabase → Authentication → URL Configuration의 Redirect URLs에 `MULEUM_SITE_URL/auth/callback`을 추가한다.
4. Email 제공자는 끈다. 초대 수락 DB 함수는 Google 로그인(`app_metadata.provider = google`)과 토큰의 `email`이 초대 이메일과 같은지 확인한다. 실제 프로젝트에서 첫 로그인 후 이 두 클레임이 들어오는지 꼭 확인한다.
5. 마이그레이션을 순서대로 적용한다: `202610230001` → `202610230002` → `202610230003` → `202610240001`.
6. **첫 관리자 지정:** 초대는 관리자만 만들 수 있으므로 첫 관리자는 직접 지정한다. 본인 구글 계정으로 `/login`에서 한 번 로그인하면 "초대받지 않은 계정"으로 거절되지만 `auth.users`에 행이 생긴다. 그 ID로 SQL 편집기에서 실행한다.

```sql
-- 첫 관리자 1명만. 이후 회원은 모두 /member/invitations의 초대 링크로 가입한다.
insert into public.member_accounts(user_id,status,enrollment) values('YOUR_AUTH_USER_ID','active','none');
insert into public.member_profiles(user_id,full_name,birth_date,residence_region) values('YOUR_AUTH_USER_ID','이름','YYYY-MM-DD','시·군·구');
insert into public.member_roles(user_id,role,status) values('YOUR_AUTH_USER_ID','administrator','approved');
```

로그인 흐름: `/auth/google`이 PKCE 검증값을 httpOnly 쿠키에 두고 Supabase `/auth/v1/authorize?provider=google`로 보낸다 → `/auth/callback`이 `POST /auth/v1/token?grant_type=pkce`로 세션을 받는다 → 초대 쿠키가 있으면 `accept_invitation` → `my_onboarding_status`에 따라 `/welcome` 또는 역할 홈으로 보낸다. 회원이 아닌 구글 계정의 세션은 즉시 폐기한다. 초대 토큰 원문은 DB에 저장하지 않고 SHA-256 값만 저장한다.

공개 가능한 publishable key만 받는다. `sb_secret_`, service role, legacy JWT 키는 이 구현에서 허용하지 않는다. 설정 누락·오류 시 실제 로그인은 닫힌다. 명시적으로 활성화한 환경에서 설정이 잘못되어도 가상 인증으로 우회하지 않는다.

`member_accounts.status = active`와 본인 `member_roles.status = approved`가 있어야 앱에 들어온다. 이 상태는 초대 수락 → 첫 로그인 확인(→ 미성년자는 보호자 동의 기록)을 거쳐서만 만들어진다. 기존 seed의 auth.users 최소 행은 실제 로그인 계정이 아니다.

서버는 Google PKCE 교환 → `/user` 검증 → 본인 계정·역할 REST 조회를 수행한다. 이메일·비밀번호 로그인 코드는 2026-10-24 삭제했다. 사용자 토큰으로 요청하므로 DB의 RLS가 적용된다. 사용자 메타데이터, 폼의 user_id·role은 권한 근거로 쓰지 않는다. 마이페이지는 본인의 성명·생년월일·시군구만 조회하며 성명·지역만 수정한다. 성별 정보를 조회·전송하지 않는다. 비밀번호와 인증 토큰을 HTML·Local Storage에 저장하지 않는다.

실제 세션 쿠키는 프로덕션에서 Secure다. 자동 갱신은 아직 구현하지 않아 최대 1시간 또는 토큰 만료 시 다시 로그인한다. 로그아웃은 Supabase 현재 세션 종료를 요청하고 로컬 쿠키를 지운다. 원격 종료 실패 시 이를 화면에 알린다. JWT의 만료 전 유효성 특성까지 완전한 즉시 폐기라고 표현하지 않는다.

### 실제 서비스에 연결하기 전 남은 작업

실제 Supabase Auth·REST·RLS 통합 검증, 초대 수락·만료·재사용 방지, 보호자 동의, 관리자 MFA, 분산 요청 제한·로그인 남용 방지, 세션 갱신·철회, 비밀번호 재설정, 계정 삭제·보유 정책, 학습 데이터의 계정별 저장소 연결, 실제 브라우저 보안 검증을 마쳐야 한다. 실제 학생 가입은 계속 닫혀 있다.

### 격리된 인증 통합 검사

```bash
npm run build
node scripts/test-auth-integration.mjs
```

별도 프로덕션 서버(127.0.0.1:3107)와 임시 포트의 가상 Auth/REST 서버를 만들고 설치된 Chrome으로 검사한다. 외부 Supabase에 접속하지 않으며 종료 시 자신이 띄운 두 서버만 종료한다. 비밀번호 오류, 복수 역할, 위조된 수정 대상 무시, 역할 철회, 정지 계정, 본인 프로필 격리, 로그아웃 실패 처리를 검사한다. 실제 PostgreSQL RLS 검사를 대체하지 않는다.

구현 근거: [Supabase Auth HTTP API](https://supabase.github.io/auth/), [Next.js 인증 가이드](https://nextjs.org/docs/app/guides/authentication). 추가 패키지는 설치하지 않았다.

## 회원 질문 기능 추가 마이그레이션

개발 DB에서 기존 `202610230001_members_and_videos.sql` 적용 후 `202610230002_question_threads.sql`을 검토·적용한다. 운영 DB에는 자동 적용하지 않는다. 기존 테스트 seed는 실제 Supabase Auth 계정 생성 도구가 아니다. 외부 개발 환경을 연결할 때는 가상 Auth 계정과 승인된 회원·역할·담당 배정을 별도로 준비해야 한다.

질문 경로·권한·재현 명령·남은 베타 요건은 [QUESTION_FLOW.md](QUESTION_FLOW.md)에 기록했다. 이번 구현은 추가 패키지나 환경 파일 변경 없이 기존 HTTP 인증을 재사용한다.
