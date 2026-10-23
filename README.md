# 물음 (MULEUM) v0.1

질문을 매개로 서로 배우는 인간 중심 교육 공동체의 로컬 시제품입니다. Phase 0·1에서 기존 학습 기능을 보존하고, 공개 소개와 회원 공간의 구조를 분리했습니다. Next.js App Router, TypeScript, Tailwind CSS를 사용하며 원본 `muleum-web-prototype.html`은 그대로 보존했습니다. 실제 초대제 서비스는 아직 운영하지 않습니다.

## 내 Mac에서 실행하기

현재 프로젝트에는 의존성 설치가 완료되어 있습니다. 터미널에서 다음을 실행하세요.

```bash
cd /Users/kimchaerin/Downloads/muleum-codex-starter
npm run dev -- --hostname 127.0.0.1
```

브라우저에서 **http://127.0.0.1:3000**을 여세요. 터미널은 켜 둡니다. 서버를 종료하려면 해당 터미널에서 `Control + C`를 누릅니다. 이미 서버가 실행 중이라면 새 서버를 켜지 않고 주소만 열면 됩니다.

다른 폴더나 Mac에 새로 복사했다면 먼저 `npm ci`를 실행하세요. 이 명령은 `package-lock.json`에 기록된 버전 그대로 의존성을 설치합니다. 패키지 관리자는 **npm만** 사용합니다. Node.js 22.18 이상이 필요하며, 이 프로젝트는 Node.js 25.9.0 / npm 11.12.1에서 검증했습니다.

`3000` 포트를 다른 앱이 사용 중이라면 다음처럼 다른 포트를 선택할 수 있습니다.

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

이때는 http://127.0.0.1:3001을 엽니다. 브라우저 저장소는 주소와 포트마다 분리되므로 기존 기록은 원래 주소에서 확인하세요. `localhost`와 `127.0.0.1`도 다른 저장 공간입니다.

## 구현된 기능

- **공통 디자인:** 요청한 아이보리·포레스트·세이지·샌드·클레이·잉크 색상을 `app/theme.css`에 모음. 본문 대비 검사와 키보드 메뉴 유지.
- **프로필·계정 시연:** `/app/profile`, `/app/register`, `/app/accounts`. 선택 성별, 직접 표현, 복수 역할, 연령/재학 분리, 보호자 관계 승인·철회, 주 담당 배정, 졸업·활동 중지, 감사 기록. 실제 인증·초대는 미연결.
- **공식 영상 자료실:** `/app/videos`. 제작자 초안·검토 요청, 관리자 공개 상태 수동 확인·승인, 학생 배정, Studio 초대·회수 확인. 요청한 공개 범위와 YouTube 확인 상태를 별도 관리. 실제 채널·API·영상 재생은 미연결.
- **SQL 기반 보안 준비:** 회원·관계·비공개 기록·영상 테이블, RLS, 관리자 전용 DB 함수, 정원 제한. 격리된 PostgreSQL에서 실행 검사했으며 웹앱/운영 DB에는 연결하지 않음.
- **공개 홈페이지 `/`:** 교육철학, 조정 가능한 120분 수업 기본형, 구성원의 관계, 공동체 비전, 비공개 베타 준비 안내. 회원 기록을 불러오지 않음.
- **회원 공간 `/app`:** 각 화면의 독립 주소, 새로고침·뒤로가기·앞으로가기, 7가지 역할 미리보기. 공지 예시 필터, 사람 중심 질문게시판 예시, 교수법 연구·졸업생 공동체·운영 공간의 골격. 새 화면의 게시·답변·모임·초대 기능은 미구현이며 시연 표시.
- **오늘의 물음:** 최근 질문, 이번 주 목표 요약, 일기와 질문 작성으로 이동.
- **나의 물음:** 최대 300자 질문과 선택적인 이유를 작성하고 목록에서 확인. 공백 입력을 거부하고 HTML 같은 문자열도 실행하지 않고 글자로 표시.
- **5분 일기:** 하루 세 가지 성찰 질문 중 하나 이상 작성, 날짜별 기록 조회, 기존 기록 수정. 하루 한 기록이며 교사·학부모 화면에 원문을 표시하지 않음.
- **주간 목표:** 학생이 직접 목표 추가, 완료·미완료 전환, 월요일 기준 이번 주와 지난 주 기록 구분. 지난 목표를 새 주의 의무로 자동 복사하지 않음.
- **120분 수업:** 5 + 10 + 10 + 55 + 5 + 25 + 10분의 7단계 체크리스트. 완료 시간에 비례하는 진행 표시. 학생·날짜별 독립 저장.
- **지도자 공간:** 가상 학생 3명 선택, 공유 동의를 가정한 예시 질문 조회, 학생별 수업 메모 작성·조회. 선생님 역할의 과외 수업 화면에서는 학생을 선택할 수 있음.
- **성장 리포트:** 학생 동의와 교사 승인이 모두 있는 가상 리포트만 표시. 실제 승인 흐름은 미구현.
- **반응형 화면:** 데스크톱·태블릿에서는 상단 가로 메뉴, 모바일에서는 왼쪽 위 메뉴 버튼으로 여는 왼쪽 슬라이드 메뉴. 메뉴 선택·닫기 버튼·바깥 영역 클릭·Esc로 닫을 수 있으며, 열린 동안 키보드 포커스와 스크롤을 메뉴 안에 유지. 상단 역할 선택으로 선생님·학부모 화면을 미리 볼 수 있음.
- **기본 사용성:** 입력 라벨, 키보드 포커스, 본문 바로가기, 빈 목록·불러오는 중·입력 오류·저장 오류 안내.

## 저장과 개인정보 범위

새 프로필·계정 관계·영상 시연은 **메모리에만 저장**하며 회원 공간 이동 중 유지되고 새로고침하면 초기화합니다. 성별·실제 개인정보를 브라우저 영구 저장소에 추가하지 않습니다. 아래 Local Storage 설명은 기존 학습 기능에 해당합니다.

저장은 **브라우저 저장소 (Local Storage)** 를 사용합니다. 같은 브라우저의 같은 주소로 돌아오면 저장한 기록이 유지됩니다. 작성 완료 버튼을 누르기 전의 입력은 임시 내용이며, 화면을 떠나면 사라집니다. 브라우저 데이터 삭제, 비공개 모드 종료 등에 따라 저장 기록이 없어질 수 있으며 기기 간 동기화나 서버 백업은 없습니다.

가상의 데이터만 사용하세요. 역할 선택은 **화면 미리보기이지 인증이나 보안 기능이 아닙니다.** 같은 브라우저에서 학생 역할로 돌아가면 일기를 볼 수 있고, 개발자 도구에서도 저장된 값을 확인할 수 있습니다. 실제 학생과 비공개 일기를 보호하려면 서버 인증과 접근 권한을 먼저 구현해야 합니다.

저장 키는 용도별로 분리합니다.

| 키 | 내용 |
| --- | --- |
| `muleum:v1:questions` | 학생의 질문 |
| `muleum:v1:goals` | 주간 목표 |
| `muleum:v1:private-journal` | 학생의 일기 |
| `muleum:v1:lessons` | 학생·날짜별 수업 체크리스트 |
| `muleum:v1:teacher-notes` | 학생별 교사 메모 |

저장 형식에 버전을 두고 읽을 때 데이터 구조를 검사합니다. 손상된 데이터는 자동 덮어쓰지 않고 저장을 중단합니다. 용량 부족이나 저장 차단 시 성공 안내를 띄우지 않고 입력을 유지합니다. 다른 탭이 같은 기록을 바꾸면 새로고침을 안내해 오래된 내용으로 덮어쓰는 것을 방지합니다.

## 프로젝트 구조

```text
app/
  layout.tsx          # Root layout and metadata
  page.tsx            # Public home
  app/layout.tsx      # Member preview shell
  app/page.tsx        # Member home
  app/[section]/page.tsx # Validated section routes
  globals.css         # Tailwind and responsive design
  theme.css           # Shared brand and semantic color tokens
  loading.tsx         # Loading state
  error.tsx           # Error boundary and retry
components/
  public-home.tsx     # Philosophy and public introduction
  member-shell.tsx    # Role preview and shared navigation
  platform-previews.tsx # Planned community spaces
  community-provider.tsx # Memory-only fictional session state
  member-profile.tsx  # Profile editing and registration preview
  account-relations.tsx # Guardian/teacher approvals and account preview
  video-library.tsx   # Official video review, assignment, invitation/revocation
  dashboard.tsx       # Existing learning panels and section selection
  navigation.tsx      # Desktop top navigation and mobile drawer
  questions.tsx       # Question form and list
  journal.tsx         # Private journal form and history
  goals.tsx           # Weekly goals
  lesson.tsx          # Lesson checklist
  teacher.tsx         # Student selection and teacher notes
  parent.tsx          # Approved report examples
  ui.tsx              # Shared cards, fields, and feedback
lib/
  platform.ts         # Roles, relationships, routes, capacity policy
  member-profile.ts   # Profile validation and age calculation
  community.ts        # Fictional accounts, video model and guarded transitions
  model.ts            # Types, fixtures, validation, and calculations
  use-local-store.ts  # Local storage and error handling
tests/
  model.test.ts       # Unit tests
  platform.test.ts    # Capacity and platform model tests
  e2e/app.spec.ts     # Browser journey tests
  e2e/platform.spec.ts # Public/member routes and privacy separation
  e2e/community.spec.ts # Profiles, relations, video workflows and contrast
supabase/
  migrations/         # PostgreSQL schema, RLS and checked functions
  seed.sql            # Local fictional fixtures only
scripts/
  test-database.mjs   # Isolated PostgreSQL policy checks
docs/                 # Vision, philosophy, operations, architecture, access, roadmap
artifacts/            # Screenshots by viewport size
```

공개 홈페이지는 `/`, 회원 홈은 `/app`입니다. 회원 공간은 `notices`, `board`, `profile`, `register`, `accounts`, `videos`, `questions`, `journal`, `goals`, `lesson`, `teacher`, `parent`, `research`, `community`, `operations` 하위 주소로 이동합니다. 예: `/app/videos`. 기존 저장 키는 변경하지 않았습니다. 역할 선택은 저장하지 않으며 직접 접속 시 해당 화면의 기본 역할로 시연합니다.

## 테스트와 빌드

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

- `test`: Node.js 기본 테스트 도구로 23개 핵심 로직·색상 대비 검사.
- `typecheck`: TypeScript 타입 검사. 값의 종류나 함수 사용이 맞는지 확인.
- `build`: 실행 배포용 파일 생성. 이 작업 환경에서 기본 Turbopack 빌드의 포트 제한 오류가 발생해 Next.js 공식 옵션인 `--webpack` 사용.
- `test:e2e`: Playwright로 **설치된 Google Chrome**을 독립된 임시 프로필로 실행. 사용자 Chrome 계정·쿠키·방문 기록은 사용하지 않음. 개발 서버가 없으면 자동으로 켬.

빌드 결과를 직접 실행하려면 다음 명령을 사용합니다.

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

http://127.0.0.1:3001에서 확인합니다. 개발 서버와 별도 포트를 사용하므로 브라우저 저장 기록도 별도입니다.

### 검증 결과

2026-10-23 기준:

- 핵심 로직·테마 테스트 **23/23 통과**.
- TypeScript 검사 통과.
- Webpack 프로덕션 빌드 통과.
- Chrome 브라우저 테스트: 기존 기능과 프로필·영상 승인·초대·회수·보호자 연결·졸업·실제 글자 대비를 세 화면 크기에서 검증. 최종 실행 결과는 아래 후속 검증 기록 참조.
- 상단 메뉴 배치, 모바일 왼쪽 메뉴 열기·닫기, Esc·바깥 영역 클릭, 키보드 포커스 순환, 화면 크기 전환 시 메뉴 닫힘 검증.
- 질문·목표·일기·수업 기록의 새로고침 후 유지, 일기 수정, 학생·날짜별 분리, 교사·학부모 화면의 일기 원문 미노출, 손상 데이터와 저장 실패 처리 검증.
- 세 화면 크기의 가로 넘침 검사 및 스크린샷 육안 확인.
- 공개 페이지의 개인 기록 미노출, 회원 경로 직접 접속·새로고침·뒤로가기·앞으로가기·404, 공지 필터와 새 역할 화면, 개인 질문과 공동 질문게시판의 분리 검증.
- 변경 도중 실행 중이던 개발 서버에서 링크 속성 관련 서버 렌더링 오류가 검출됨. 개발 서버 재시작 후 동일한 전체 검사 30개가 통과했으며 오류 검사를 비활성화하지 않음.
- 의존성 설치 시 npm 보안 점검에서 보고된 취약점 0개. 지속적인 보안 보장을 의미하지는 않음.

### 후속 검증 기록 — 디자인·회원·공식 영상

- `npm run test`: **23/23 통과**.
- `node scripts/test-database.mjs /private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js`: **37개 통과**. 실제 PostgreSQL RLS/함수/정원 경계를 검사했으며 Supabase Auth·HTTP·다중 연결 동시성 검사는 포함하지 않음.
- `npm run test:e2e`: **45/45 통과**. 15개 시나리오 × 3개 화면 크기. 주요 공개·학생·선생님·관리자 화면의 실제 글자 대비 검사 포함.
- `npm run build`, `npm run typecheck`, `git diff --check`: 통과.
- 등록 시연 추가 후 프로필 검사 3개가 페이지 이동 중 이전 폼을 조작해 실패함. URL과 새 화면 제목을 확인한 뒤 입력하도록 고치고 전체 45개 재검증 완료.
- 기존 HTML SHA-256: `ddc561adf8574aea67a75c968d4697019bffdfde66a5316ff99e015db41b042f` 유지.

화면 미리보기: [공개 홈페이지](artifacts/desktop-public.png), [모바일 홈페이지](artifacts/mobile-public.png), [회원 홈](artifacts/desktop-home.png), [모바일 프로필](artifacts/mobile-profile.png), [영상 관리](artifacts/desktop-videos.png), [모바일 메뉴](artifacts/mobile-menu.png).

## 남은 작업과 다음 단계

실제 로그인, 데이터베이스, 서버 권한, AI API, 화상수업, 공개 배포는 연결하지 않았습니다. 실제 iPhone/iPad Safari 및 Mac Safari 검증도 아직 수행하지 않았습니다. Chrome의 모바일 화면 크기 검증은 실제 기기 검증을 대체하지 않습니다.

1. Phase 2: 가상 데이터로 공지 작성·공개 범위, 사람의 질문·답변·후속 질문, 학생과 선생님의 관계를 구체화합니다.
2. Phase 3: 초대제 인증, 관계별 서버 권한, Supabase의 행 수준 보안 (Row Level Security, RLS)을 구현합니다. RLS는 데이터베이스에서 사용자별로 읽고 쓸 수 있는 행을 제한하는 규칙입니다.
3. 일기 본인 전용 권한, 학생 간 격리, 파일 권한, 동의·보관·삭제 정책과 정원 동시성 검증을 완료한 뒤 실제 베타를 시작합니다.
4. 졸업생 모임, AI 보조, 결제·정산은 후속 검토 대상입니다. 수수료와 교육 정책을 임의로 확정하지 않습니다.

현재 기술 부채: 수업 체크리스트는 기존 고정 단계 인덱스를 사용하므로 편집 가능한 수업 모델을 도입할 때 버전별 기록 전환이 필요합니다. 정원 검사는 순수 함수로 준비했으나 서버·데이터베이스에서 강제하지 않습니다. 역할 선택과 메뉴 숨김은 보안이 아니며, 작성 중 임시 입력은 페이지 이동 시 유지하지 않습니다.

외부 서비스 연결이나 공개 배포 전에는 별도 확인을 받습니다.

## 참고 문서

- [디자인 토큰과 접근성](docs/DESIGN_SYSTEM.md)
- [회원 DB·관계·공식 YouTube 설계](docs/MEMBERS_AND_VIDEOS.md)
- [로컬 SQL 검사 및 Supabase 연결 준비](docs/DEVELOPMENT_SETUP.md)
- [제품 비전](docs/PRODUCT_VISION.md)
- [교육철학](docs/EDUCATION_PHILOSOPHY.md)
- [운영 모델](docs/OPERATING_MODEL.md)
- [구조와 기존 코드 분석](docs/ARCHITECTURE.md)
- [접근 권한 설계](docs/ACCESS_CONTROL.md)
- [단계별 개발 계획](docs/ROADMAP.md)
- [Next.js 설치 및 App Router 구성](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS의 PostCSS 설치 방식](https://tailwindcss.com/docs/installation/using-postcss)
- 제품 요구사항: `PRODUCT_BRIEF.md`
- 프로젝트 개발 규칙: `AGENTS.md`

`next.config.ts`에서 Next.js의 개발 규칙 자동 추가 기능을 꺼 원본 `AGENTS.md`를 보존하고, 모바일 메뉴를 가리지 않도록 개발 표시 버튼을 숨겼습니다.
