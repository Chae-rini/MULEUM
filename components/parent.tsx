import { reports, visibleReports } from "@/lib/model";
import { Card, Empty, Heading } from "./ui";

export function Parent() {
  const approved = visibleReports(reports);
  return <><Heading eyebrow="GROWING TOGETHER" title="성장의 기록" description="학부모에게는 학생의 사적인 기록이 아니라, 서로 합의한 교육 목표와 지도 과정을 설명해요." /><div className="content-grid"><div className="stack">{approved.length ? approved.map((report) => <Card key={report.id}><div className="section-header"><span className="pill">승인된 리포트 예시</span><span className="small">{report.student} · 가상 데이터</span></div><h2 className="mt-6">이번 주에 관찰된 성장</h2><p className="report-copy">{report.growth}</p><hr /><h3>다음 수업의 방향</h3><p className="muted">{report.next}</p><div className="note">학생의 공유 동의와 선생님의 승인이 완료된 상황을 가정한 예시예요. 실제 승인 절차는 아직 연결되지 않았어요.</div></Card>) : <Empty>아직 승인된 성장 리포트가 없어요.</Empty>}</div><Card className="soft"><span className="decorative-icon" aria-hidden="true">♡</span><h2>학부모와의 신뢰</h2><p>일기 원문이나 개인적인 고민은 기본적으로 공유하지 않아요.</p><p>수업 성취, 지도 방향, 학생이 공유에 동의한 학습 목표만 필요한 범위에서 전달하는 것을 원칙으로 해요.</p><hr /><p className="small mb-0">성적은 중요한 도구지만 사람의 가치를 평가하는 기준이 아니에요. 스스로 질문하는 작은 변화를 함께 지켜봐 주세요.</p></Card></div></>;
}
