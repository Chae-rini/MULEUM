import Link from "next/link";

export default function NotFound() {
  return <section className="loading"><h1>이 페이지를 찾을 수 없어요.</h1><p>주소를 확인하거나 물음의 시작 화면으로 돌아가 주세요.</p><Link className="button" href="/">물음 소개로 돌아가기</Link></section>;
}
