import { redirect } from "next/navigation";
import { requireIdentity } from "@/lib/auth/server";
import { memberHome } from "@/lib/auth/policy";
export default async function MemberIndex() { redirect(memberHome(await requireIdentity())); }
