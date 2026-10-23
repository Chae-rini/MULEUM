# 디자인 시스템 — Warm Natural Minimalism

공통 원본은 `app/theme.css`다. 공개 홈페이지와 회원·선생님·관리자 화면은 같은 `app/globals.css`와 `components/ui.tsx`의 Card, Heading, Field, Feedback, DemoNotice를 사용한다. 새 패키지나 외부 폰트를 추가하지 않았다.

| 토큰 | 값 | 사용 |
| --- | --- | --- |
| ivory | #FAF7F2 | 기본 배경, 어두운 버튼 위 글자 |
| forest | #2F4A3E | 버튼, 링크, 브랜드 영역 |
| sage | #809B87 | 구분선과 장식 |
| sand | #E8DED2 | 차분한 보조 카드 |
| clay | #B9775A | 작은 강조 장식 |
| dark-ink | #3B3530 | 본문과 제목 |
| text-secondary | #59534C | 도움말·보조 본문 |
| surface | #FFFFFF | 입력·카드 바탕 |

세이지·클레이를 작은 본문 색으로 사용하지 않는다. 브랜드 원색을 유지하면서 글자에는 대비가 확보되는 의미별 토큰을 적용한다. 카드 그림자를 제거하고, 기존 한국어 시스템 글꼴과 여백을 유지했다. 입력 경계·키보드 초점은 구분 가능한 진한 색을 사용한다.

`tests/design.test.ts`는 본문/배경 조합을 WCAG AA 일반 텍스트 4.5:1 기준으로 계산한다. `tests/e2e/community.spec.ts`는 공개·학생·선생님·관리자·프로필의 실제 계산된 글자색과 배경색을 세 화면 크기에서 검사한다. 큰 글자는 3:1 기준이다. 이는 전체 WCAG 인증이 아니며 화면낭독기·OS 고대비 모드·실기기 검증은 별도다.

모바일 왼쪽 메뉴, 큰 화면 상단 메뉴, 키보드 순환·Esc 닫기, 본문 바로가기, 감소된 움직임 설정을 보존했다. 새 프로필/영상 폼은 좁은 화면에서 한 열로 표시한다.

근거: [W3C 텍스트 대비 기준](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html).
