import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "물음 | 모든 배움은 하나의 질문에서",
  description: "모든 배움은 하나의 질문에서 시작된다. 질문으로 만나고 서로에게 배우며 자신의 삶을 선택하는 인간 중심 교육·학습 공동체, 물음.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
