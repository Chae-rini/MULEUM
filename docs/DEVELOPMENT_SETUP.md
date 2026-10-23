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
4. Supabase 클라이언트 패키지와 SSR 세션 모듈은 실제 연결 단계에서 추가한다. publishable key는 공개 가능한 키지만 service role/secret은 서버 전용이며 NEXT_PUBLIC_ 변수나 번들에 넣지 않는다. 일반 요청에 RLS 우회용 관리자 클라이언트를 쓰지 않는다.
5. 로그인 세션에서 DB 함수 호출자의 ID를 얻는다. 현재 데모의 역할 선택·actor 인자는 인증 근거로 사용하지 않는다. 실제 프로필을 데모 컨텍스트에 적재하지 않는다.
6. 직접 REST/SQL/RPC 요청, 탈퇴·철회, 부모 다대다 관계, 미성년자, 관리자 경계, 10번째/100번째 동시 승인과 재시도 검사를 반복한다.
7. 공식 채널 소유 확인·개인정보 정책·필요한 보호자 동의·보유기간·보안 검증을 마친 후 별도 승인으로 베타를 연다.

SQL 스키마는 새 개발 DB 기준이며 기존 DB에 반복 적용하는 스크립트가 아니다. 연결·배포·비밀키 생성·실제 이메일 전송은 이번 작업에서 실행하지 않았다.
