import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "물음 | 모든 배움은 하나의 질문에서",
  description: "질문하고, 탐구하고, 나만의 한 걸음을 선택하는 물음. 가상 데이터로 사용하는 로컬 데모입니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
