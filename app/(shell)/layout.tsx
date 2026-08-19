import { Shell } from "@/components/ui/shell";
import { requireSession } from "@/lib/auth/guards";

const PROJECTS = [
  { key: "WEB", name: "Website Redesign", color: "oklch(0.6396 0.1221 54.97)", issueCount: 13 },
  { key: "MOB", name: "Mobile App v2", color: "oklch(0.6050 0.0591 141.65)", issueCount: 9 },
  { key: "BRD", name: "Brand Refresh", color: "oklch(0.6300 0.1550 30.00)", issueCount: 5 },
  { key: "SEO", name: "SEO Campaign", color: "oklch(0.5259 0.0603 247.43)", issueCount: 6 },
  { key: "OPS", name: "Ops & Roadmap", color: "oklch(0.6722 0.1132 72.89)", issueCount: 4 },
];

const MEMBERS = [
  { initials: "MA", bg: "oklch(0.5956 0.1154 56.61)" },
  { initials: "DR", bg: "oklch(0.5432 0.0359 82.61)" },
  { initials: "PR", bg: "oklch(0.5607 0.0978 33.48)" },
  { initials: "LN", bg: "oklch(0.5259 0.0603 247.43)" },
  { initials: "SF", bg: "oklch(0.6722 0.1132 72.89)" },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <Shell members={MEMBERS} projects={PROJECTS} isAdmin={session.role === "admin"}>{children}</Shell>;
}