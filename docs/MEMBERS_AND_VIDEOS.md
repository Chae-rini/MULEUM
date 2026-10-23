# 회원·관계·공식 영상 설계

기준: 2026-10-23 사용자 요청 및 제공된 ‘물음 프로젝트 기획 회의록 v0.1’. 회의록은 설계 근거이며 현재 구현 완료 목록이 아니다. 교육과정·수수료·보유기간·예외적인 법정대리인 열람 정책은 미확정으로 유지한다.

## 현재 구현과 실행 경계

- 기존 Next.js·TypeScript·Tailwind와 브라우저 학습 기록을 보존했다.
- `/app/profile`, `/app/register`, `/app/accounts`, `/app/videos`는 가상 데이터 시연이다. 새 데이터는 React 메모리에서 회원 공간을 이동하는 동안 유지되고 새로고침하면 초기화한다. 개인정보를 Local Storage에 추가하지 않는다.
- 실제 Supabase 연결·가입·이메일·초대 수락·YouTube API 호출은 없다. 별도 `/login`, `/member/[role]`, `/mypage`의 인증 코드를 추가하고 가상 Auth/REST 서버로 검증했다. 기존 `/app` 역할 선택은 계속 인증이 아니며 데모 자료는 브라우저 코드에서 볼 수 있다. 설정과 제한은 `DEVELOPMENT_SETUP.md`를 따른다.
- SQL 마이그레이션은 준비하고 격리된 PostgreSQL 엔진에서 실행했다. 웹앱은 이 DB에 연결하지 않았다. SQL 정책의 통과를 실제 웹서비스 보안 완료로 해석하면 안 된다.
- 기존 교사 화면의 학생 3명·리포트 예시는 기존 기능 그대로이며 새 관계 시연과 아직 통합하지 않았다. 실제 DB 연결 전 저장소를 일원화해야 한다.

## 단일 계정과 독립 속성

Supabase `auth.users.id` 하나를 계정의 기준으로 사용한다. 학생과 보호자는 서로 다른 인증 계정이며 공유 로그인을 사용하지 않는다.

```text
auth.users
  -> member_accounts -> member_roles (multiple approved roles)
  -> member_profiles (own basic profile)
  -> member_optional_profiles (own optional gender)
  -> guardian_links (many parents <-> many students)
  -> teacher_assignments (one current primary teacher per student)
  -> video_assignments -> video_recipient_emails
```

기본 역할은 student, parent, teacher, alumni, administrator다. teaching_assistant와 community_operator는 별도 승인하는 추가 활동 역할이다. 기존 UI의 assistant/operator 값은 미리보기 식별자이며 DB 역할과 명시적으로 매핑한다.

계정 가입 상태 invited/active/suspended, 재학 active/alumni/none, 여러 승인 역할은 별개다. 성년은 생년월일과 한국 날짜에서 계산하며 DB에 고정 boolean으로 저장하지 않는다. `ageOn`과 `my_age_category()`를 준비했다. 민법 19세 기준을 적용하며 성별이나 졸업 여부로 추론하지 않는다. 생년월일 입력 자체는 신원·연령 검증 증명이 아니므로 실제 운영 시 확인 절차가 추가되어야 한다. 음주 등 개별 법률의 연령 기준을 이 값 하나로 판단하지 않는다.

## 필수·선택 개인정보

- 기본: user_id(UUID), full_name, birth_date, residence_region(시·군·구), created_at, updated_at.
- 선택: gender는 null / male / female / other / prefer_not_to_say. null과 명시적인 비공개 의사를 구분한다.
- gender_description은 other에서만 최대 120자, 빈 값 허용. 다른 선택으로 바꾸면 지운다. 간성과 논바이너리는 같은 개념으로 해석하지 않는다.
- 성별은 본인 외 기본 접근 불가. 생년월일과 상세 성별을 교사·학부모·공개 응답에 포함하지 않는다. 정밀 주소 입력란은 없다. 자유 입력 지역의 의미까지 자동 보증하지 않으므로 실제 가입에는 시·군·구 선택형 목록을 검토한다.
- 분석·광고·AI 학습 전송을 구현하지 않았다. 로그에는 역할 변경의 행 ID·행위·시각만 남기고 개인정보 원문은 기록하지 않는다.

## 테이블과 권한

| 테이블 | 목적 / 기본 접근 |
| --- | --- |
| member_accounts, member_roles | 계정·역할; 본인 및 승인 관리자. 변경은 검사하는 DB 함수만 |
| member_profiles, member_optional_profiles | 기본/선택 프로필; 활성 본인만. 관리자 예외 없음 |
| guardian_links | 다대다 보호자 관계; 관리자 승인·철회, 관계자에게 상태 표시 |
| teacher_assignments | 학생 주 담당·이력; 관리자 배정 변경, 활성 배정 중복 금지 |
| member_invitations | 만료·해시·요청 역할·사용/철회 시각. 일반 클라이언트 접근 없음; 발송/수락 미구현 |
| member_deletion_requests | 본인 삭제 요청; 실제 삭제·보관·백업 처리 미구현 |
| private_journals, private_questions | 본인 CRUD; 관리자·교사·보호자 예외 없음 |
| shared_learning_items | 일정·과제·리포트; 본인/담당 교사. 보호자는 승인 연결+parent_shared, 리포트는 학생·교사 승인 모두 필요 |
| official_channel | singleton 1행, 실제 채널 ID 미설정 |
| education_videos, video_creators | 공식 영상 메타데이터와 여러 제작자 |
| video_assignments | 학생 배정과 초대/회수 수동 확인 상태 |
| video_recipient_emails | 배정별 Google 이메일; 본인과 관리자만, 제작 교사도 원문 접근 없음 |
| permission_audit | 권한 변경 기록; 관리자 읽기만, 일반 클라이언트 변경 불가 |

`related_student_summaries()`는 승인된 교사·보호자에게 학생 ID와 성명만 반환한다. 생년월일·지역·성별을 포함하는 원본 프로필을 반환하지 않는다. 원문 테이블의 RLS와 별개로 함수를 통한 우회도 테스트한다.

졸업은 같은 ID를 유지하고 student 역할을 해제하며 alumni 역할을 부여한다. 교사·조교·관리자 승격은 별도 승인이다. 과외 종료와 계정 중지는 담당 관계·영상 배정을 종료하고 YouTube 회수 대기로 바꾼다. 졸업 후 본인 기록 열람은 이번 개발 정책에서 유지하지만, 실제 보유기간·삭제·미성년 졸업생 활동 정책은 별도로 확정한다. 성인 전용 모임은 아직 열지 않았다.

정원은 교사 10명·교사당 활성 학생 10명·전체 활성 학생 100명이다. DB 함수가 공통 정원 행을 갱신해 쓰기 작업을 직렬화하고, 트리거와 부분 유일 인덱스로 우회 쓰기·중복 주 담당도 제한한다. 실제 PostgreSQL의 다중 연결 동시성·재시도·교착 검증은 남아 있다. 신규 활성화 함수는 아직 제공하지 않으며 초대 수락·동의·주 담당 배정을 한 트랜잭션으로 완성하기 전 활성화를 열지 않는다.

## 공식 YouTube 운영

개인 교사 채널은 등록하지 않는다. official_channel 1행과 video_creators 다대다 구조를 사용한다. 실제 공식 채널 ID가 없으므로 채널 소유 확인이나 실제 영상을 가장하지 않는다.

```text
제작 초안 -> 업로드 완료 기록 -> 검토 요청
 -> 관리자: 공식 채널·YouTube 상태 수동 확인 -> 최종 승인
 -> 비공개 학생 배정 -> Studio 이메일 초대 -> 초대 완료 기록
 -> 과외 종료: 물음 노출 중단 + 회수 대기 -> Studio 회수 -> 완료 기록
```

- 요청 공개 범위 private/public, 관찰된 YouTube 상태 unknown/private/public/unlisted를 분리한다.
- 상태가 다르거나 공식 채널 확인이 해제되면 승인을 취소하고 학생 노출을 중단한다. 관찰 기록은 자동 동기화 결과가 아니며 확인자와 시각을 저장한다. 이후 Studio에서 몰래 바뀐 상태는 감지할 수 없다.
- Unlisted는 배정·시청 허용 조건을 충족하지 않는다. 공개 영상은 관리자 승인·Public 확인·공식 채널 확인·실제 영상 표시가 모두 충족될 때만 `public_video_catalogue()`에서 제목/설명/유형/Video ID를 내보낸다. 개인정보·배정·제작자 프로필은 제외한다.
- 공개 홈페이지는 실제 승인 영상이 없으므로 빈 콘텐츠 섹션을 표시한다. 데모를 공개 성과나 실제 영상처럼 소개하지 않는다.
- 복습 자료실은 승인된 본인 배정 영상만 표시한다. 초대 대기는 표시하되, 실제 직접 열기 링크는 초대 완료까지 제공하지 않는다. fixture 영상은 초대 확인 후에도 재생 링크를 만들지 않는다.
- 실제 연결 시 `watchUrl`은 검증된 11자리 Video ID로 `https://www.youtube.com/watch?v=...`만 생성한다. 임베드·추적 썸네일·자동 업로드는 없다.
- 수동 초대 확인은 학생의 Google 이메일을 확인하고 Studio에서 공유한 뒤 기록한다. Google 계정은 Supabase 로그인 이메일과 같다고 가정하지 않는다. 확인하지 않은 실제 이메일을 추정하지 않는다.
- 물음 배정 종료는 YouTube 권한 회수를 실행하지 않는다. 회수 대기를 별도 관리하고 실제 이메일 변경·탈퇴 시에도 기존 공유를 먼저 회수해야 한다. 개인정보 삭제로 회수 대상이 사라지지 않도록 운영 절차를 확정한다.
- YouTube의 비공개 공유 인원·계정·연령·관리형 계정 제약은 실제 채널에서 검증해야 한다. 전체 100명에게 한 영상을 공유할 수 있다고 가정하지 않는다.

## 실제 가입·베타 전 필수

초대 전용 Supabase Auth 설정, 일회용 초대 수락의 원자성, 안전한 관리자 최초 생성, 사용자 세션 검증, API의 동등한 인가, 관리자 MFA, CSRF/요청 제한, 파일 권한, 감사 로그 보관, 승인·동의 증빙이 필요하다. 계정 해제·역할 철회·세션 무효화도 통합 검증한다.

개인정보 처리방침·적법한 처리 근거·목적별 최소 항목·보유 및 삭제기간을 확정한다. 특히 만 14세 미만 처리에 필요한 법정대리인 동의와 확인을 구현·검증하기 전에는 가입을 활성화하지 않는다. 보호자 관계 승인과 개인정보 처리 동의는 같은 의미가 아니다. 성별 제공 여부에 따른 기능 제한은 두지 않는다.

## 확인한 공식 자료

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): UI가 아닌 DB 접근 정책.
- [Supabase DB 함수](https://supabase.com/docs/guides/database/functions): 고정 search_path, 실행 권한 제한, 함수 내부 인가.
- [YouTube 공개 상태·비공개 공유](https://support.google.com/youtube/answer/157177?hl=en): Private 이메일 공유와 Unlisted 링크 재공유 차이.
- [민법 제4조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029560047): 19세 성년 기준.
