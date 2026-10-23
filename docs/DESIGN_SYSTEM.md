# 디자인 시스템 — Soft Blue Library

공통 원본은 `app/theme.css`다. 공개 홈페이지·로그인·마이페이지·역할별 회원 화면은 같은 색상 토큰과 `app/globals.css`를 사용한다. Card, Heading, Field, Feedback의 기능은 유지한다. 새 패키지나 외부 폰트를 추가하지 않았다.

| 토큰 | 값 | 사용 |
| --- | --- | --- |
| brand-primary | #78AFFE | 브랜드 강조와 구획선 |
| brand-primary-light | #C5DCFC | 선택과 부드러운 강조 |
| brand-action | #3567B7 | 주요 버튼 |
| background | #F8FBFF | 전체 배경 |
| surface | #FFFFFF | 카드·입력창 |
| surface-blue | #EAF3FF | 보조 섹션·회원 안내 |
| surface-muted | #F1F3F7 | 중립 배경 |
| surface-paper | #FBF9F5 | 일기·성찰 |
| text-primary | #29374C | 제목과 본문 |
| text-secondary | #4F5D73 | 보조 글자 |
| border-default | #E2E8F0 | 카드 경계 |

주요 버튼은 흰색 글자와 Action Blue를 사용한다. Hover #2C579B, Active #244880이며 비활성 버튼은 중립 배경과 짙은 보조 글자로 표시한다. 활성화 중 순간적인 대비 저하를 막기 위해 버튼 색상 전환 애니메이션은 사용하지 않는다. 입력 경계 #78869A와 초점 #3567B7은 밝은 표면에서 3:1 이상이다. 성공·주의·오류는 각각 #3F5E31, #76501B, #9A3428과 밝은 전용 배경을 유지한다.

CSS Variables와 Tailwind `@theme inline`을 연결했다. 예: `bg-brand-action text-primary-foreground`, `bg-surface-blue text-ink`. 옛 오렌지·세이지·오크 토큰 이름은 새 의미에 맞게 교체했다. 카드는 기본 14px 모서리와 약한 그림자다. 한국어 시스템 산세리프를 사용하고 본문 15px, 작은 안내는 최소 12px, 모바일 입력은 16px로 표시한다. 교육철학과 수업 안내 문구는 보존했다.

## 이미지

- `public/brand/muleum-icon-blue.png`: 사용자가 제공한 1254×1254 공식 아이콘을 그대로 복사했다. 공통 로고·로그인·파비콘에 사용하며 자르거나 늘리지 않는다.
- `public/brand/library-concept.png`: 사용자가 추가 제공한 1536×1024 도서관 콘셉트 이미지다. 홈페이지에서 전체 3:2 비율을 유지한다. “브랜드 분위기를 위한 참고 이미지 · 물음 운영 시설 아님”을 표시한다.
- 이전 노란 아이콘과 Unsplash 사진은 보존한다. 현재 홈페이지는 새 콘셉트 이미지를 사용한다.
- 사용자 제공 이미지의 제작 도구·라이선스 문서는 전달되지 않았다. 공개 배포 전에 외부 사용 권리를 확인한다.
- 소형 전용 아이콘·투명 배경·PWA 설치 기능은 이번 범위에 포함하지 않았다.
- Lucide SVG의 로컬 사본과 라이선스는 `public/icons/`에 유지한다. 외부 폰트·이미지 요청이나 개인정보 자동 전송은 없다.

## 검증 범위

`tests/design.test.ts`는 정확한 팔레트, Tailwind 연결, 본문 4.5:1 및 초점·입력 경계 3:1 대비를 계산한다. `tests/e2e/community.spec.ts`는 공개·학습 화면 15개 경로, `tests/e2e/auth.spec.ts`는 로그인·다섯 역할 홈·마이페이지의 실제 글자 대비와 가로 넘침을 검사한다. 큰 글자는 3:1 기준이다.

브라우저 검사는 Chrome의 데스크톱 1440×1000, 태블릿 768×1024, 모바일 390×844에서 수행한다. 모바일 왼쪽 메뉴, 큰 화면 상단 메뉴, 키보드 순환·Esc 닫기, 감소된 움직임 설정을 유지한다. 실제 기기의 Safari·Android, 화면낭독기·OS 고대비 모드는 별도 확인이 필요하다. 이 검사는 전체 WCAG 인증을 의미하지 않는다.

졸업생은 계정 상태만 안내하며 내부 라운지·모임·게시판이나 존재하지 않는 외부 링크를 추가하지 않았다. 인증·DB·권한·학습 로직은 디자인 변경 대상이 아니다.

## 실행 결과 — 2026-10-23

- `npm run test`: 31/31 통과.
- `npm run test:e2e`: 첫 실행 53/54 통과. 저장 버튼 활성화 시 배경색 전환으로 순간 대비가 낮아지는 문제를 수정한 뒤 전체 재실행 54/54 통과.
- `npm run typecheck`, `npm run build`, `git diff --check`: 통과.
- 홈페이지 데스크톱·모바일, 태블릿 학생 홈, 모바일 로그인 스크린샷을 직접 확인했다. 결과는 `artifacts/`에 저장된다.
- SHA-256 비교로 새 이미지 두 개가 제공 원본과 동일하며 기존 HTML 시제품도 변경되지 않았음을 확인했다.
