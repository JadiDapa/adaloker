import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/clerk-session";

export default async function HomePage() {
  await requireAccount();
  redirect("/groups");
}
