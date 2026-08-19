import * as stylex from "@stylexjs/stylex";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import IconLogo from "@/components/icons/logo";
import { getCurrentForcedReset, getCurrentSession } from "@/lib/auth/session";
import { colors, radius, shadow, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  background: {
    minHeight: structure.minHeightScreen,
    width: structure.widthFull,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    padding: space.s7,
    backgroundImage: "radial-gradient(120% 100% at 50% 0%, #FBF6EC 0%, #EFE6D4 55%, #E7DAC4 100%)",
  },
  card: {
    width: "min(420px, 94vw)",
    backgroundColor: colors.card,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.border,
    borderRadius: radius.xl2,
    boxShadow: shadow.lg,
    paddingTop: space.s9,
    paddingInline: space.s9,
    paddingBottom: space.s8,
  },
  brandRow: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s4,
    marginBottom: space.s7,
  },
  brandName: {
    fontSize: type.sizeLg,
    fontWeight: type.weightBold,
    letterSpacing: type.trackingTight,
    color: colors.foreground,
  },
  heading: {
    fontSize: type.size2xl,
    fontWeight: type.weightBold,
    letterSpacing: type.trackingTight,
    color: colors.foreground,
    marginBottom: space.s2,
  },
  subheading: {
    fontSize: type.sizeSm,
    lineHeight: type.leadingRelaxed,
    color: colors.textSecondary,
    marginBottom: space.s7,
  },
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getCurrentSession()) redirect("/users");
  if (await getCurrentForcedReset()) redirect("/change-password");
  const query = await searchParams;
  return (
    <div {...stylex.props(styles.background)}>
      <div {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.brandRow)}>
          <IconLogo
            width={30}
            height={30}
          />
          <span {...stylex.props(styles.brandName)}>One Space</span>
        </div>
        <h1 {...stylex.props(styles.heading)}>Login</h1>
        <p {...stylex.props(styles.subheading)}>
          Welcome back. Enter your work email and password to continue.
        </p>
        <LoginForm
          error={typeof query.error === "string" ? query.error : undefined}
          retryAt={typeof query.retryAt === "string" ? query.retryAt : undefined}
        />
      </div>
    </div>
  );
}