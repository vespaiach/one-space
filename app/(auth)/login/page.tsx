import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentForcedReset, getCurrentSession } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getCurrentSession()) redirect("/users");
  if (await getCurrentForcedReset()) redirect("/change-password");
  const query = await searchParams;
  return (
    <section>
      <h1>Log in</h1>
      <LoginForm
        error={typeof query.error === "string" ? query.error : undefined}
        retryAt={typeof query.retryAt === "string" ? query.retryAt : undefined}
      />
    </section>
  );
}