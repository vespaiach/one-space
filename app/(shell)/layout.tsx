import { Shell } from "@/components/ui/shell";
import { requireSession } from "@/lib/auth/guards";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <Shell isAdmin={session.role === "admin"}>{children}</Shell>;
}