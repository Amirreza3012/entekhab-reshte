import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/roles";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(ROLE_HOME[session.user.role]);
  }

  redirect("/login");
}
