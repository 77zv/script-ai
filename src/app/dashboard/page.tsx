import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="w-full py-12 sm:py-16 lg:py-24">
      <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Dashboard</h1>
      <p className="mt-4 text-sm text-gray-500 sm:text-base">
        Welcome to your dashboard, {session.user.name || session.user.email}
      </p>
    </div>
  );
}
