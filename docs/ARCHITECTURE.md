# 아키텍처와 기존 프로젝트 분석

> 후속 구현: `app/theme.css` 공통 색상, `lib/member-profile.ts`·`lib/community.ts` 모델, 회원 공간의 `CommunityProvider`, `/app/profile`·`/app/register`·`/app/accounts`·`/app/videos`를 추가했다. `supabase/migrations/202610230001_members_and_videos.sql`은 로컬에서 실행 검증했지만 웹앱과 DB는 연결하지 않았다. 이 문서의 ‘미래 데이터 모델’은 초기 분석 기록이며 현재 상세 내용은 [회원·공식 영상](MEMBERS_AND_VIDEOS.md)에 있다.

## Phase 0 분석

분석 기준: 기존 `AGENTS.md`, `PRODUCT_BRIEF.md`, `README.md`, HTML 시제품, `app/`, `components/`, `lib/`, `tests/`, `package.json` 및 작업 트리.

| 영역 | 기존 상태 | 이번 결정 |
| --- | --- | --- |
| 기술 | Next.js 16.4.2, React 19.3.1, TypeScript 5.9, Tailwind 4, npm | 스택과 의존성 유지 |
| 화면 | `/`의 단일 클라이언트 대시보드에서 메뉴 상태 변경 | 공개 `/`와 `/app` 경로 계층 분리 |
| 메뉴 | 직전 작업의 PC 상단 메뉴·모바일 왼쪽 대화상자 메뉴 | 최근 미커밋 변경까지 보존하고 실제 링크로 확장 |
| 질문·목표·일기 | 입력 검증과 브라우저 저장 동작 | 기존 컴포넌트·저장 키 재사용 |
| 수업 | 7단계 고정 120분 체크리스트 | 기본형 보존, 향후 버전 있는 템플릿 계약 분리 |
| 교사·학부모 | 가상 학생별 메모, 별도 승인 리포트 예시 | 기능 유지, 실제 권한과 구분 |
| 인증·서버 | 없음 | 이번에도 연결하지 않음 |
| 테스트 | 로직 8개, 세 화면 크기의 브라우저 테스트 | 경로·메뉴 회귀 및 새 골격 검증 추가 |
| 빌드 | Turbopack 빌드의 환경 포트 제한으로 Webpack 사용 | 검증된 빌드 명령 유지 |

Node.js 25.9.0 / npm 11.12.1 환경에서 기존 구현을 개발했다. 원본 HTML과 기획서는 보존한다. GitHub 원격은 연결되어 있으나 이번 작업은 커밋·푸시·배포를 자동 수행하지 않는다.

## 경로와 책임

```text
/                         PublicHome: philosophy and public introduction
/app                      MemberShell + student or role preview dashboard
/app/notices              Notice categories, fictional examples
/app/board                Human-centered question board scaffold
/app/questions            Existing private question journal
/app/journal              Existing private daily journal
/app/goals                Existing weekly goals
/app/lesson               Existing lesson checklist
/app/teacher              Existing teacher notes and fictional students
/app/parent               Existing approved report examples
/app/research             Teaching research scaffold
/app/community            Alumni community scaffold
/app/operations           Operations and capacity-policy scaffold
```

`app/app/layout.tsx`가 회원 공간의 공통 셸을 제공한다. `app/app/[section]/page.tsx`는 허용한 섹션 목록만 처리하고 잘못된 경로는 404로 응답한다. 실제 링크를 사용해 직접 접속·새로고침·뒤로가기·앞으로가기를 지원한다.

장점: 주소를 공유하거나 개별 화면을 확장하기 쉽고 기존 기능 컴포넌트를 다시 만들 필요가 없다. 단점: 현재 섹션 라우트와 `Dashboard`는 하나의 등록 목록을 공유하므로 향후 기능 규모가 커지면 각 기능을 개별 페이지·데이터 로더로 나누는 작업이 필요하다.

## 코드 경계

```text
PublicHome -> public copy and illustrative lesson model
Member route -> MemberShell -> Navigation + role preview context
                           -> Dashboard -> existing functional panels
                                        -> platform scaffolds
Functional panels -> useLocalStore -> versioned Local Storage records
Domain contracts -> roles / relationships / capacity rules (future server reuse)
```

- 공개 페이지는 회원 저장 훅을 사용하지 않는다. 가상 학생 목록·일기·교사 메모를 공개 홈에서 불러오지 않는다.
- `Navigation`은 경로 링크와 모바일 모달 메뉴만 맡는다. 인증을 판단하지 않는다.
- `MemberShell`의 단일 선택 역할은 UX 미리보기다. 실제 회원의 복수 역할 모델은 `RoleAssignment[]`이며 이 선택 상자와 다르다.
- 경로별 최초 미리보기 역할은 화면에 맞춰 정하며, 역할은 공통 레이아웃이 유지되는 동안 공유된다. 새로고침 후 공통 게시판 등은 학생 미리보기로 돌아갈 수 있다. 보안 세션을 흉내내는 쿠키를 만들지 않는다.
- 기존 로컬 저장 키와 JSON 버전은 유지한다. 같은 origin에서는 `/`에서 `/app`로 옮겨도 기록을 읽을 수 있다. 저장 데이터 마이그레이션은 필요하지 않다.
- 새 게시판 예시는 별도 정적 데이터이며 개인 질문 저장소와 연결하지 않는다. 실제 게시 동작도 없다.

## 미래 데이터 모델 — 아직 DB를 생성하지 않음

| 묶음 | 제안 엔터티 | 핵심 제약 |
| --- | --- | --- |
| 회원 | members, role_assignments, invitations | 계정·역할·연령·재학 상태 분리; 역할별 승인 |
| 관계 | student_teacher_assignments, guardian_links, data_grants | 활성 주 담당 1명; 추가 관계의 범위·철회 |
| 학습 | private_questions, weekly_goals, journals | 본인 소유; 개인 기록과 게시글 분리 |
| 수업 | lesson_templates, lesson_sessions, teacher_notes | 템플릿 버전·수업 당시 단계 스냅샷 |
| 공유 | growth_reports, report_consents, report_approvals | 동의·승인·수신자 확인; 일기 자동 조인 금지 |
| 공지·질문 | notices, audiences, board_posts, replies, followups | 공간별 대상·공개 범위·답변 권한 |
| 교육팀 | research_documents, meeting_notes, anonymized_cases | 팀 범위·비식별 검토 |
| 공동체 | groups, group_memberships, events | 연령 정책·참가 승인; 졸업 자동 권한 없음 |
| 운영 | approvals, audit_events, capacity_state | 승인 변경 추적; 동시 정원 초과 방지 |
| 회계 | fee_agreements, ledger_entries | 추후 설계만; 미확정 요율을 기본값으로 만들지 않음 |

식별값, 외래키, 소유자·관계 상태·정책 버전 등을 포함한 실제 SQL 스키마는 Phase 2~3에서 확정한다. 현재 타입 계약을 DB 보안 정책으로 오해하지 않는다.

## 서버 도입 경계

향후 브라우저 요청 → 서버 세션 확인 → 권한·관계·공유 정책 → 데이터 저장소 순서를 적용한다. Supabase Auth/PostgreSQL/RLS 도입은 별도 승인과 안전한 환경 변수 설정 후 진행한다. UI 필터와 서버 인가 (Authorization: 어떤 작업이 허용되는지 판단)는 독립적이다.

정원은 UI의 동일 계산 로직 외에도 DB 트랜잭션과 동시성 제약으로 보호한다. 설계는 [운영 모델](OPERATING_MODEL.md), 자료별 권한은 [접근 권한](ACCESS_CONTROL.md)에 정리한다.

AI는 향후 별도의 서버 모듈로 추가한다. 현재 AI SDK·프롬프트 실행·API·자동 일기 분석은 없다. 결제와 외부 영상·화이트보드도 실행 경로가 없는 별도 후속 연동이다.

## 기술 부채와 위험

- 로컬 저장은 인증·암호화·백업·다기기 동기화를 제공하지 않는다. 자료량 증가와 브라우저 삭제에 취약하다.
- UI 역할 구분은 보안이 아니다. 현재 데모는 실제 회원 전용이 될 수 없다.
- 기존 수업 단계 인덱스는 고정형이다. 편집 도입 전 ID·템플릿 버전·과거 기록 마이그레이션이 필요하다.
- 폼의 저장 전 초안은 화면 이동 시 사라진다. 자동 저장·이탈 안내는 후속 UX 과제다.
- 기존 기능 컴포넌트의 JSX가 긴 부분은 기능 단위 확장 시 작은 컴포넌트로 분리한다. 이번 작업에서는 무관한 전면 재작성을 피한다.
- 브라우저 테스트는 Chrome의 세 화면 크기를 대상으로 한다. Safari/iOS/iPadOS/Android 실기기 검증은 별도 과제다.

## 실행과 검증

`npm run test`, `npm run typecheck`, `npm run test:e2e`, `npm run build`를 사용한다. 새 경로 추가 시 Next.js 생성 타입이 오래된 빌드 경로를 가리키면 `npm run build`로 다시 생성한 뒤 타입 검사를 실행한다. 개발 서버는 `npm run dev -- --hostname 127.0.0.1`이며 공개 배포는 하지 않는다.
