# PWA and notification readiness

## 구현된 범위

PWA(Progressive Web App)는 웹사이트를 홈 화면에서 앱처럼 여는 방식입니다. `app/manifest.ts`에 설치 정보, `public/brand/muleum-icon-question-*.png`에 공식 물음표 아이콘의 용도별 파일(any 192·512, maskable 512, apple-touch 180, 파비콘 32·16)을 준비했습니다. 만든 방법과 한계는 `docs/DESIGN_SYSTEM.md`의 '이미지' 절에 있습니다. 이전 `pwa-*.png`는 보존만 합니다.

`public/sw.js` 서비스 워커(Service Worker)는 브라우저의 백그라운드 이벤트 처리 코드입니다. 회원 페이지·API·개인 기록을 캐시하지 않으며 오프라인 학습 기능은 제공하지 않습니다. 푸시 본문은 알려진 종류만 받아 고정 안내로 바꾸고, 클릭은 `/member`로 이동해 인증을 다시 거칩니다. 이름·질문 제목·본문·일기 내용을 표시하지 않습니다.

회원용 알림 설정 화면은 없습니다. 2026-10-24에 가상 설정 체험 화면(`/member/notifications`, `components/notifications/settings.tsx`, `components/pwa/install-help.tsx`)을 삭제했고, 이 주소는 404입니다. 실제 푸시를 연결할 때 설정 화면을 새로 만듭니다. 알림 종류·기본값(모두 꺼짐, 조용한 시간 22:00–08:00, Asia/Seoul)·수신 권한 규칙은 `lib/notifications/model.ts`에 남아 있습니다.

지금은 어떤 화면도 알림 권한을 요청하지 않습니다. 로그아웃은 기존 기기 구독과 표시된 알림을 해제합니다. 서비스 워커는 페이지에서 보내는 메시지를 받지 않습니다. 삭제한 테스트 버튼이 쓰던 `MULEUM_PREVIEW`와, 보내는 곳이 없던 `MULEUM_CLEAR` 처리를 함께 지웠습니다. 그래서 알림은 푸시 이벤트로만 표시됩니다.

## 사용자 안내 페이지

`/guide/app`은 로그인 없이 볼 수 있는 설치·알림 안내입니다. iPhone·iPad(Safari), Android(Chrome·삼성 인터넷), 컴퓨터(Chrome·Edge·Mac Safari) 설치 순서, 알림이 베타 때 열린다는 안내와 준비 중인 원칙, 역할별 알림 종류, 문제 해결을 담습니다. 로그인 화면과 마이페이지에서 연결됩니다.

- 역할별 알림 종류는 `lib/notifications/model.ts`의 `allowedKinds`·`notificationLabels`에서 그대로 가져옵니다. 종류를 바꾸면 안내도 함께 바뀝니다.
- 실제 푸시와 설정 화면을 연결하면 안내의 ‘준비 중’ 항목과 ‘알림 받기’ 섹션에 설정 순서를 다시 적어야 합니다.
- 브라우저 메뉴 이름은 2026-10-24 기준 각 브라우저 한국어 도움말을 따랐습니다. [Chrome 앱 설치](https://support.google.com/chrome/answer/9658361?hl=ko), [Edge 앱 설치](https://support.microsoft.com/ko-kr/microsoft-edge/install-manage-or-uninstall-apps-in-microsoft-edge-0c156575-a94a-45e4-a54f-3a84846f6113), [Mac Safari Dock에 추가](https://support.apple.com/ko-kr/104996), [삼성 인터넷 홈 화면 추가](https://www.samsungsvc.co.kr/solution/36791). iOS 26의 Safari 흐름(`⋯` → 공유 → 홈 화면에 추가 → 웹 앱으로 열기)은 Apple 공식 문서를 확인하지 못해 2차 자료 기준이며, 실제 기기에서 다시 확인해야 합니다.

## 데이터 모델과 발송 경계

`202610230003_notifications.sql`은 운영 DB에 적용하지 않은 추가 마이그레이션입니다.

- `notification_settings`: 계정별 동의·종류·시간대·조용한 시간·일기 시각.
- `push_subscriptions`: 계정별 기기 endpoint·암호화 키·동의·해제 시각. 다른 계정의 endpoint 재사용을 차단합니다. 본인도 일반 SELECT로 endpoint·키를 읽지 못합니다.
- `notification_outbox`: 수신자·종류·리소스 식별자·중복 방지 키·발송 가능 시각·만료·상태. 민감한 원문은 저장하지 않습니다.

행 수준 보안(Row Level Security, RLS)은 자기 설정·구독 메타데이터만 읽도록 제한합니다. 구독·설정 변경은 본인 인증을 확인하는 DB 함수만 허용합니다. 관리자는 역할만으로 다른 회원의 구독을 열람할 수 없습니다.

발송 직전 권한 함수는 활성 계정, 승인 역할·관계, 동의, 종류, 유효기간과 조용한 시간을 다시 확인합니다. 답변은 질문 작성자, 새 질문은 승인된 담당 선생님만 대상이며 비공개 전환·담당 변경 시 기존 대기 건도 제외합니다. 학부모 일정은 승인 관계와 명시적 공유 조건을 모두 요구합니다. 실제 공지 공개·대상 테이블이 없으므로 공지 발송 권한은 항상 거부합니다.

역할·계정 상태 변경 시 구독 해제, 동의 비활성화 및 대기 건 취소를 처리합니다. 계정 삭제 시 관련 알림 데이터는 함께 삭제됩니다. 로그아웃 서버 함수는 스키마 적용을 확인한 환경에서만 `MULEUM_NOTIFICATION_SCHEMA_READY=true`로 연결합니다. 현재 환경 파일은 수정하지 않았습니다. 이 서버 함수는 보수적으로 **계정의 모든 기기** 구독을 해제합니다. 해제 실패 시 안내 후 로그인 세션은 종료합니다.

`lib/notifications/vapid.ts`는 Web Push 발송 서버의 신원을 서명하는 VAPID 구조와 검증을 제공합니다. 임시 키로 서명·검증만 테스트하며 운영 키는 생성하지 않았습니다. 개인 키는 서버에서만 관리해야 합니다. 허용된 HTTPS 푸시 서비스 호스트만 받습니다.

## 아직 연결하지 않은 부분

`livePushEnabled=false`이며 실제 Supabase 프로젝트 연결은 없습니다. 다음은 베타 전 별도로 구현·검증해야 합니다.

1. 인증된 설정·구독 API와 UI 연결, CSRF·요청 제한·입력 크기 검증, 승인된 로컬/개발 Supabase에 마이그레이션 적용 및 실제 Auth 통합 검사.
2. 실제 PushManager 구독과 VAPID 공개 키 배포, RFC 8291 메시지 암호화·HTTP 전송. 현재는 서명 구조만 있으며 완성된 발송 서버가 아닙니다.
3. 질문 답변·새 질문 트랜잭션의 outbox 생성, 수업 시각 모델·일정 변경 이벤트, 공지 공개 대상 모델, 일기 선택 예약. 기존 질문 기능은 자동 알림을 생성하지 않습니다.
4. 작업 예약·중복 방지·동시 작업 잠금·재시도·만료 처리. 조용한 시간에는 보류하고 오래된 수업 알림은 만료 후 보내지 않아야 합니다.
5. 발송 직전 재검증과 로그아웃·권한 변경 경합 처리, HTTP 404/410 구독 폐기, endpoint 검증·리다이렉트 금지·네트워크 제한, 로그에서 구독 키 제거. 발송 중 이미 OS에 전달된 알림을 완전히 회수할 수는 없습니다.
6. 실제 사용자 동의·탈퇴·다중 기기·공용 기기 정책. 민감 기록은 분석·광고·AI 학습에 전달하지 않습니다.

새 패키지·운영 DB 변경·실제 사용자 발송은 이번 작업에 없습니다.

## 검증 방법

```bash
npm run test
npm run typecheck
npm run test:e2e
npm run build
node scripts/test-notification-database.mjs /path/to/@electric-sql/pglite/dist/index.js
```

SQL 검사는 임시 PGlite PostgreSQL과 가상 회원만 사용합니다. Supabase 운영 환경·실제 HTTP 푸시 전달 검증을 대체하지 않습니다. 브라우저의 네이티브 알림 표시는 테스트에서 가로채므로 OS에 알림을 보내지 않습니다.

2026-10-23 실행 결과: 단위 테스트 41개, 알림 SQL/RLS 검사 18개, Chrome 브라우저 검사 63개(모바일·태블릿·데스크톱), 기존 질문 통합 검사 14개, 기존 인증 통합 검사 7개 통과. 타입 검사와 프로덕션 빌드도 통과했습니다. 기존 공유 서버를 보존하기 위해 빌드는 소스 복사본 `/private/tmp/muleum-pwa-build-JjX4hs`에서 실행했습니다. 모바일·데스크톱 알림 화면 스크린샷을 육안 확인했습니다.

## 실제 기기 확인 항목

- iPhone·iPad: iOS/iPadOS 16.4 이상에서 홈 화면에 추가한 앱으로 열고 버튼을 눌러 권한 요청. 일반 Safari 탭과 설치 앱 동작을 각각 확인합니다.
- Android Chrome 및 macOS 지원 브라우저: 설치 메뉴·아이콘·독립 창·권한 요청·거부 후 복구를 확인합니다. Chrome 화면 크기 테스트는 Safari·실제 기기 테스트가 아닙니다.
- 잠금 화면, 백그라운드, 앱 종료, 집중 모드, 알림 클릭 후 재로그인, 조용한 시간·시간대 변경, 로그아웃·계정 전환·삭제·권한 변경, 다중 기기와 재설치를 확인합니다.
- HTTPS의 안정된 도메인이 필요합니다. 임시 공유 링크가 바뀌면 설치 앱·구독도 기존 주소를 가리키므로 정식 테스트 주소를 먼저 정해야 합니다. 링크를 아는 것 자체는 접근 권한이 아니며 로그인 검사를 유지해야 합니다.

공식 근거: [WebKit iOS/iPadOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe), [VAPID RFC 8292](https://datatracker.ietf.org/doc/html/rfc8292), [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps).
