import type { Metadata } from "next";
import { MemberShell } from "@/components/member-shell";

export const metadata: Metadata = {
  title: { default: "회원 공간 시연 | 물음", template: "%s | 물음 회원 공간 시연" },
  robots: { index: false, follow: false },
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
