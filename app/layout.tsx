import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { RegisterPwa } from "@/components/pwa/register";
import "./globals.css";

// Self-hosted at build time, so visitors never request Google Fonts.
const notoSansKr = Noto_Sans_KR({ weight: ["400", "500", "600", "700", "800"], display: "swap", preload: false, fallback: ["Apple SD Gothic Neo", "system-ui", "sans-serif"] });

export const metadata: Metadata = {
  title: "물음 | 모든 배움은 하나의 질문에서",
  description: "모든 배움은 하나의 질문에서 시작된다. 질문으로 만나고 서로에게 배우며 자신의 삶을 선택하는 인간 중심 교육·학습 공동체, 물음.",
  icons: {
    icon: [{ url: "/brand/muleum-icon-question-32.png", type: "image/png", sizes: "32x32" }, { url: "/brand/muleum-icon-question-16.png", type: "image/png", sizes: "16x16" }],
    apple: [{ url: "/brand/muleum-icon-question-apple-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "물음", statusBarStyle: "default" },
};
// Browser chrome follows the page ground: white by day, deep navy by night (literal values; metadata cannot read CSS tokens).
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FFFFFF" }, { media: "(prefers-color-scheme: dark)", color: "#0B1426" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={notoSansKr.className}>{children}<RegisterPwa /></body></html>;
}
