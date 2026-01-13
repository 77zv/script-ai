import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
