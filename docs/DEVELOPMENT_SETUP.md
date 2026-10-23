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
3. 공개 가입을 비활성화한 단일 Auth 체계를 구성한다. 일반 사용자 회원 행 생성·활성화 권한을 열지 않는다. 서버에서 초대·동의·주 담당·정원을 검증하는 활성화 트랜잭션을 먼저 구현한다.
4. 현재는 추가 패키지 없이 공식 Auth/REST API와 서버 쿠키로 로그인 코드를 준비했다. 아래 로그인 설정 절차를 따른다. 자동 세션 갱신·추가 로그인 방식이 필요하면 공식 SDK 도입을 별도 검토한다. publishable key는 공개 가능한 키지만 service role/secret은 서버 전용이며 NEXT_PUBLIC_ 변수나 번들에 넣지 않는다. 일반 요청에 RLS 우회용 관리자 클라이언트를 쓰지 않는다.
5. 로그인 세션에서 DB 함수 호출자의 ID를 얻는다. 현재 데모의 역할 선택·actor 인자는 인증 근거로 사용하지 않는다. 실제 프로필을 데모 컨텍스트에 적재하지 않는다.
6. 직접 REST/SQL/RPC 요청, 탈퇴·철회, 부모 다대다 관계, 미성년자, 관리자 경계, 10번째/100번째 동시 승인과 재시도 검사를 반복한다.
7. 공식 채널 소유 확인·개인정보 정책·필요한 보호자 동의·보유기간·보안 검증을 마친 후 별도 승인으로 베타를 연다.

SQL 스키마는 새 개발 DB 기준이며 기존 DB에 반복 적용하는 스크립트가 아니다. 연결·배포·비밀키 생성·실제 이메일 전송은 이번 작업에서 실행하지 않았다.

## 로그인과 마이페이지 — 추가 구현

`/login`에서 학생·학부모·선생님·졸업생·관리자의 가상 계정을 선택하면 `/member/[role]`로 이동한다. `/mypage`는 해당 계정의 기본 정보와 승인 역할을 보여준다. 비로그인은 로그인 화면으로 보내고, 다른 역할 주소는 서버에서 차단한다. 로그아웃과 새로고침 후 세션 유지가 동작한다.

`/app`는 기존 기능을 보존한 독립 시연이다. 로그인 계정의 학습 기록으로 취급하거나 자동 이동하지 않는다. 새 회원 홈은 실제 학습 DB를 조회하지 않으며 실제 연결 모드에서는 해당 기능을 준비 중으로 표시한다. 졸업생 커뮤니티 메뉴는 없으며 기존 `/app/community` 주소는 `/mypage`로 연결한다.

가상 로그인은 `npm run dev`에서만 제공한다. 임의 역할을 선택할 수 있는 체험이므로 실제 회원 인증이 아니다. 쿠키는 HttpOnly·SameSite=Lax·1시간이며 개발 서버를 다시 시작하면 가상 세션이 만료될 수 있다. 프로덕션 및 실제 인증 설정 모드에서는 가상 로그인과 쿠키를 인정하지 않는다.

### Supabase 개발 환경 설정

이번 작업은 설정 파일·비밀키·운영 DB를 변경하지 않았다. 외부 프로젝트 연결 승인 후 개발 환경에 다음 변수를 설정한다. 값을 채팅·Git·스크린샷에 올리지 않는다.

```dotenv
MULEUM_ENABLE_AUTH=true
SUPABASE_URL=https://YOUR_DEVELOPMENT_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_DEVELOPMENT_KEY
```

공개 가능한 publishable key만 받는다. `sb_secret_`, service role, legacy JWT 키는 이 구현에서 허용하지 않는다. 설정 누락·오류 시 실제 로그인은 닫힌다. 명시적으로 활성화한 환경에서 설정이 잘못되어도 가상 인증으로 우회하지 않는다.

Supabase의 공개 가입을 비활성화하고, **가상 개발 계정만** Auth에 준비한다. 기존 SQL 스키마의 `member_accounts.status = active`와 본인 `member_roles.status = approved`가 있어야 앱에 들어온다. 초대 발송·수락·활성화·정원 승인 절차는 이번 로그인 코드가 대신하지 않는다. 기존 seed의 auth.users 최소 행은 실제 비밀번호 로그인 계정이 아니다.

서버는 공식 Auth HTTP API의 password grant → `/user` 검증 → 본인 계정·역할 REST 조회를 수행한다. 사용자 토큰으로 요청하므로 DB의 RLS가 적용된다. 사용자 메타데이터, 폼의 user_id·role은 권한 근거로 쓰지 않는다. 마이페이지는 본인의 성명·생년월일·시군구만 조회하며 성명·지역만 수정한다. 성별 정보를 조회·전송하지 않는다. 비밀번호와 인증 토큰을 HTML·Local Storage에 저장하지 않는다.

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
