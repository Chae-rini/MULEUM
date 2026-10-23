# 물음 (MULEUM) v0.1

학생이 질문 → 탐구 → 행동 → 성찰을 반복하며 자기주도적으로 배우도록 돕는 로컬 웹앱입니다. 기존 `muleum-web-prototype.html`의 색감, 카드 구조, 한국어 콘텐츠를 바탕으로 Next.js App Router, TypeScript, Tailwind CSS로 구현했습니다. 원본 HTML은 그대로 보존했습니다.

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

- **오늘의 물음:** 최근 질문, 이번 주 목표 요약, 일기와 질문 작성으로 이동.
- **나의 물음:** 최대 300자 질문과 선택적인 이유를 작성하고 목록에서 확인. 공백 입력을 거부하고 HTML 같은 문자열도 실행하지 않고 글자로 표시.
- **5분 일기:** 하루 세 가지 성찰 질문 중 하나 이상 작성, 날짜별 기록 조회, 기존 기록 수정. 하루 한 기록이며 교사·학부모 화면에 원문을 표시하지 않음.
- **주간 목표:** 학생이 직접 목표 추가, 완료·미완료 전환, 월요일 기준 이번 주와 지난 주 기록 구분. 지난 목표를 새 주의 의무로 자동 복사하지 않음.
- **120분 수업:** 5 + 10 + 10 + 55 + 5 + 25 + 10분의 7단계 체크리스트. 완료 시간에 비례하는 진행 표시. 학생·날짜별 독립 저장.
- **지도자 공간:** 가상 학생 3명 선택, 공유 동의를 가정한 예시 질문 조회, 학생별 수업 메모 작성·조회. 선생님 역할의 과외 수업 화면에서는 학생을 선택할 수 있음.
- **성장 리포트:** 학생 동의와 교사 승인이 모두 있는 가상 리포트만 표시. 실제 승인 흐름은 미구현.
- **반응형 화면:** 데스크톱·태블릿의 왼쪽 메뉴와 모바일 하단 메뉴. 상단 역할 선택으로 선생님·학부모 화면을 미리 볼 수 있음.
- **기본 사용성:** 입력 라벨, 키보드 포커스, 본문 바로가기, 빈 목록·불러오는 중·입력 오류·저장 오류 안내.

## 저장과 개인정보 범위

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
  page.tsx            # App Router entry
  globals.css         # Tailwind and responsive design
  loading.tsx         # Loading state
  error.tsx           # Error boundary and retry
components/
  dashboard.tsx       # Role preview, navigation, and home
  questions.tsx       # Question form and list
  journal.tsx         # Private journal form and history
  goals.tsx           # Weekly goals
  lesson.tsx          # Lesson checklist
  teacher.tsx         # Student selection and teacher notes
  parent.tsx          # Approved report examples
  ui.tsx              # Shared cards, fields, and feedback
lib/
  model.ts            # Types, fixtures, validation, and calculations
  use-local-store.ts  # Local storage and error handling
tests/
  model.test.ts       # Unit tests
  e2e/app.spec.ts     # Browser journey tests
artifacts/            # Screenshots by viewport size
```

v0.1은 `/` 경로 안에서 메뉴를 전환하는 방식입니다. 새로고침하면 학생 홈으로 돌아가지만 저장한 기록은 유지됩니다. 개별 화면 URL과 브라우저 뒤로가기 기반 화면 전환은 후속 단계입니다.

## 테스트와 빌드

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

- `test`: Node.js 기본 테스트 도구로 8개 핵심 로직 검사.
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

- 핵심 로직 테스트 **8/8 통과**.
- TypeScript 검사 통과.
- Webpack 프로덕션 빌드 통과.
- Chrome 브라우저 테스트 **15/15 통과**: 5가지 시나리오 × 데스크톱 1440px, 태블릿 768px, 모바일 390px.
- 질문·목표·일기·수업 기록의 새로고침 후 유지, 일기 수정, 학생·날짜별 분리, 교사·학부모 화면의 일기 원문 미노출, 손상 데이터와 저장 실패 처리 검증.
- 세 화면 크기의 가로 넘침 검사 및 스크린샷 육안 확인.
- 초기 브라우저 테스트는 Next.js의 내부 접근성 알림과 앱 오류 알림을 동시에 선택해 실패했으며, 검사 범위를 앱 본문으로 한정한 뒤 전체 통과.
- 의존성 설치 시 npm 보안 점검에서 보고된 취약점 0개. 지속적인 보안 보장을 의미하지는 않음.

화면 미리보기: [데스크톱](artifacts/desktop-home.png), [태블릿](artifacts/tablet-home.png), [모바일](artifacts/mobile-home.png).

## 남은 작업과 다음 단계

실제 로그인, 데이터베이스, 서버 권한, AI API, 화상수업, 공개 배포는 연결하지 않았습니다. 실제 iPhone/iPad Safari 및 Mac Safari 검증도 아직 수행하지 않았습니다. Chrome의 모바일 화면 크기 검증은 실제 기기 검증을 대체하지 않습니다.

1. 가상 데이터로 학생·선생님·학부모 흐름을 직접 사용해 보고 문구와 수업 진행 방식을 조정합니다.
2. 인증과 관계 모델을 설계하고 Supabase Auth, PostgreSQL, 행 수준 보안 (Row Level Security, RLS)을 도입합니다. RLS는 데이터베이스에서 사용자별로 읽고 쓸 수 있는 행을 제한하는 규칙입니다.
3. 일기 본인 전용 권한, 학생 간 격리, 기록 삭제·보관 정책, 학생 동의와 교사 승인 리포트 흐름을 구현·검증합니다.
4. 기본 흐름과 권한 검증 후 AI 질문 코치를 연결합니다. 학생의 답을 대신 쓰지 않고 이유·근거·반례·검증 방법을 묻도록 설계합니다.

외부 서비스 연결이나 공개 배포 전에는 별도 확인을 받습니다.

## 참고 문서

- [Next.js 설치 및 App Router 구성](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS의 PostCSS 설치 방식](https://tailwindcss.com/docs/installation/using-postcss)
- 제품 요구사항: `PRODUCT_BRIEF.md`
- 프로젝트 개발 규칙: `AGENTS.md`

`next.config.ts`에서 Next.js의 개발 규칙 자동 추가 기능을 꺼 원본 `AGENTS.md`를 보존하고, 모바일 메뉴를 가리지 않도록 개발 표시 버튼을 숨겼습니다.
