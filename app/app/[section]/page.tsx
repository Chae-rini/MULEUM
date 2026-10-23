import { notFound, redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { isSection, sectionDefinitions } from "@/lib/platform";

export function generateStaticParams() {
  return Object.keys(sectionDefinitions).filter((section) => section !== "home").map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: isSection(section) ? sectionDefinitions[section].label : "화면을 찾을 수 없어요" };
}

export default async function MemberPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSection(section) || section === "home") notFound();
  if (section === "community") redirect("/mypage");
  return <Dashboard page={section} />;
}
