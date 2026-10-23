# 회원 질문과 대화 — 개발 구현

## 실제 구현 범위

`/member/questions`와 `/member/questions/[id]`는 Supabase 인증 계정의 질문·답변·후속 질문을 DB에 저장하는 경로다. 기존 `/app/questions`, `/app/board`와 브라우저 저장소를 재사용하지 않는다. 개발용 역할 쿠키로는 이 경로의 데이터를 조회하거나 저장할 수 없다. AI 답변은 없다.

현재 외부 Supabase 개발 프로젝트는 연결하지 않았다. 준비된 구현과 로컬 PostgreSQL/RLS·가상 Auth 통합 검증을 운영 연결 완료로 해석하지 않는다. 기존 공개 임시 링크에도 새 기능을 배포하지 않았다.

## 테이블과 권한

- `question_threads`: 질문 ID, 작성 학생, 당시 담당 배정 ID, 제목·본문, 공개 범위, 상태, 버전, 생성·수정 시각.
- `question_messages`: 대화 ID, 질문 ID, 인증된 작성자, 답변/후속 질문 구분, 본문, 순서, 시각.
- `teacher_assignments`: 기존 승인 관계를 재사용한다. 공유 시 배정 ID를 질문에 고정하므로 담당 변경 시 새 교사에게 자동 전달되지 않는다.
- 기존 `private_questions`, 일기, 영상, 회원 테이블은 변경하지 않는다.

| 사용자 | 읽기 | 쓰기 |
| --- | --- | --- |
| 활성 학생 | 자신의 질문과 모든 대화 | 재학생이며 승인된 학생 역할일 때 질문·후속 질문·공유 범위·마무리 관리 |
| 담당 선생님 | 해당 배정이 유효하고 공유된 질문·대화 | 승인된 교사 역할과 담당 관계를 다시 검증한 뒤 답변 |
| 다른 학생·다른 교사 | 없음 | 없음 |
| 학부모·관리자·조교·운영진 | 해당 역할만으로 접근 불가 | 해당 역할만으로 접근 불가 |
| 비로그인·정지 계정 | 없음 | 없음 |

복수 역할은 각각의 승인된 권한을 가진다. 관리자 역할이 있더라도 질문을 읽으려면 본인의 학생 소유권 또는 별도 승인된 교사 역할·담당 관계가 필요하다. DB는 활성 소유자의 과거 기록 읽기를 허용하지만, 앱은 학생/교사 역할이 없는 졸업생용 기록 열람 화면을 이번에 추가하지 않았다.

공개 범위는 기본 `private`(나만 보기), 선택 `teacher`(담당 교사 공유)다. 공개 게시판·학부모 공유는 지원하지 않는다. 학생이 새 담당 교사에게 명시적으로 다시 공유하면 이전 답변까지 포함한 전체 대화가 전달된다는 안내를 표시한다. 이미 읽거나 복사한 내용은 공유 철회로 회수할 수 없다.

## 저장과 상태

서버 액션은 로그인·역할·담당 관계를 확인한다. Supabase 요청은 사용자 토큰을 사용하고 캐시하지 않는다. 실제 읽기는 RLS, 쓰기는 인증된 사용자만 실행 가능한 DB 함수(RPC)가 다시 검사한다. 원본 테이블의 직접 INSERT/UPDATE/DELETE는 일반 회원에게 허용하지 않는다. 함수는 빈 `search_path`와 명시된 스키마 이름을 사용한다.

- `create_question`: 인증된 학생 ID를 직접 결정하고 제목 1~120자, 내용 1~4,000자, 공개 범위를 검증한다.
- `update_question`: 답변/후속 질문, 공개 범위, 마무리/재개를 처리한다. 작성자 ID와 상태는 클라이언트가 지정하지 않는다.
- 교사 답변은 `answered`, 학생 후속 질문은 `follow_up`, 학생의 마무리는 `resolved`다. 답변 전에는 후속 질문을 쓰지 않고, 마무리한 질문은 재개한 후 대화를 이어간다.
- DB 행 잠금과 버전 비교로 오래된 화면의 덮어쓰기·중복 답변을 거부한다. 신규 질문은 요청 ID로 재시도를 중복 저장하지 않는다.
- 버전 충돌은 `PT409`로 반환한다. 비즈니스 충돌에 `40001`을 사용하면 PostgREST가 트랜잭션 재시도를 수행할 수 있으므로 [Supabase 공식 안내](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b)를 따라 구분했다.
- 저장 오류 시 폼 입력을 유지하며, 성공 전에 성공 메시지를 표시하지 않는다. 저장하지 않은 입력의 페이지 이동·로그인 만료 복구는 아직 없다.
- 질문 목록은 최근 수정된 100개까지다. 상세 대화는 현재 전체를 읽는다. 페이지 나누기는 후속 작업이다.

## 로컬 검증 방법

기존에 준비된 로컬 PGlite를 사용한다. 테스트는 운영 URL이나 비밀키를 읽지 않는다.

```bash
npm run test
node scripts/test-question-database.mjs /private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js
npm run build
node scripts/test-question-integration.mjs
npm run test:e2e
npm run typecheck
git diff --check
```

SQL 검사는 임시 디스크 DB에 가상 계정을 생성하고, 계정별 SQL 권한·RLS·DB 재시작 후 보존을 확인한다. 임시 폴더 경로를 출력하며 자동 삭제하지 않는다. 통합 검사는 로컬 3108 포트의 프로덕션 앱, 가상 Auth, 실제 SQL/RLS로 이어지는 테스트 전용 REST 어댑터를 사용한다. 브라우저는 설치된 Chrome을 독립 프로필로 실행한다. 테스트용 인증 서버와 REST 어댑터를 운영에 배포하지 않는다.

기존 공유 서버가 `.next`를 사용 중이면 소스 복사본에서 빌드하고 `MULEUM_TEST_APP_DIR=/path/to/built-copy node scripts/test-question-integration.mjs`로 검사할 수 있다. 복사본에는 동일한 app/components/lib/public 및 빌드 설정을 사용한다.

범위 밖: 실제 Supabase JWT·PostgREST·관리형 권한 기본값, 다중 PostgreSQL 연결의 동시 승인/철회, 실제 iPhone Safari. 로컬 검증을 관리형 환경 검증으로 표시하지 않는다.

## 발견한 남은 문제

| 우선순위 | 작업 | 현재 상태 |
| --- | --- | --- |
| P0 — 베타 전 필수 | Supabase 개발 환경에 순서대로 마이그레이션을 적용하고 실제 Auth/REST/RPC/RLS 검사 | 미연결. 운영 DB 자동 수정 금지 |
| P0 | 초대 수락·만료·재사용 방지, 활성화·역할·관계 승인 운영 절차 | 스키마·일부 함수가 있으나 회원 가입 과정 미완성 |
| P0 | 동의·보유기간·삭제·보호자 확인 및 연령 확인 정책 | 미확정. 기존 프로필 DB 수정 권한과 연령 판단의 신뢰 경계도 검토 필요 |
| P0 | 로그인/질문 쓰기 요청 제한, 관리자 추가 인증, 비밀키·로그·백업/복구 검증 | 별도 구현·운영 검증 필요 |
| P0 | 독립 DB 연결에서 공유 철회·교사 교체·계정 정지와 쓰기 경쟁 검증 | 행 잠금·버전 검사는 구현했지만 실제 다중 연결 부하 검증 전 |
| P1 — 핵심 기능 | 세션 갱신·비밀번호 재설정·만료 시 작성 내용 복구 | 현재 최대 1시간 재로그인, 서버 저장 기록은 유지 |
| P1 | 질문 목록/대화 페이지 나누기, 답변 도착 표시, 신고·운영 대응 | 미구현 |
| P1 | 질문 수정·삭제와 공유 이력·보존 범위 정책 | 이번에는 생성·대화·상태·공유 변경만 구현 |
| P2 — 후속 개선 | 초안 보존, 검색·필터, 선택 알림, 실제 기기 접근성 검사 | 후속 작업 |

개인 일기·학부모 리포트·목표·공지의 실제 DB 저장, 졸업생 라운지는 이번 구현 범위가 아니다.

## 실행 결과 — 2026-10-23

| 검사 | 결과 |
| --- | --- |
| `npm run test` | 35/35 통과 |
| `node scripts/test-question-database.mjs /private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js` | 23/23 통과; 디스크 DB를 닫고 다시 열어 기록 확인 |
| `node scripts/test-database.mjs /private/tmp/muleum-sql-check/node_modules/@electric-sql/pglite/dist/index.js` | 기존 검사 37/37 통과 |
| `npm run test:e2e` | 기존 기능 54/54 통과; 데스크톱·태블릿·모바일 |
| `npm run build` | 동일 소스 임시 복사본 `/private/tmp/muleum-question-build-ROgyYi`에서 통과 |
| `npm run typecheck` | 작업 폴더에서 통과 |
| `MULEUM_TEST_APP_DIR=/private/tmp/muleum-question-build-ROgyYi node scripts/test-question-integration.mjs` | 14/14 통과; 데스크톱 1440×1000·모바일 390×844 |
| `git diff --check` | 통과 |

통합 검사 초기에 Next.js의 별도 알림 영역과 폼 오류 선택자가 겹쳐 본문으로 범위를 한정했다. 스트리밍 로딩 이후 `notFound()`는 HTTP 200 응답 안에 오류 화면을 렌더링할 수 있으므로 차단 화면과 응답 본문의 비공개 원문 부재를 함께 검사한다. DB의 직접 접근 차단은 별도 SQL 검사로 확인했다.

`artifacts/desktop-question-thread.png`, `artifacts/mobile-question-thread.png`를 렌더링하고 직접 확인했다. 기존 원본 HTML의 SHA-256도 유지됐다. 새 패키지·비밀키·환경 파일·운영 DB는 변경하지 않았다. 공유용 프로덕션 서버의 빌드를 덮어쓰지 않았다.
