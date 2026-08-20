import * as stylex from "@stylexjs/stylex";
import IconHome from "@/components/icons/home";
import { Link } from "@/components/ui/link";
import { colors, radius, shadow, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  main: {
    flex: 1,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    padding: space.s11,
  },
  content: {
    display: structure.flex,
    flexDirection: "column",
    alignItems: structure.alignCenter,
    textAlign: "center",
    maxWidth: "440px",
  },
  iconChip: {
    width: "76px",
    height: "76px",
    borderRadius: radius.xl2,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    backgroundColor: colors.accent,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.border,
    color: colors.primary,
    marginBottom: space.s9,
  },
  eyebrow: {
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWider,
    textTransform: "uppercase",
    color: colors.primary,
    marginBottom: space.s5,
  },
  heading: {
    fontSize: type.size3xl,
    fontWeight: type.weightBold,
    letterSpacing: type.trackingTight,
    color: colors.foreground,
    margin: space.s0,
    marginBottom: space.s5,
  },
  description: {
    fontSize: type.sizeBase,
    lineHeight: type.leadingRelaxed,
    color: colors.textSecondary,
    margin: space.s0,
    marginBottom: space.s8,
  },
  cta: {
    display: "flex",
    alignItems: "center",
    gap: space.s4,
    paddingBlock: space.s4,
    paddingInline: space.s7,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    fontSize: type.sizeBase,
    fontWeight: type.weightSemibold,
    boxShadow: shadow.sm,
    textDecorationLine: "none",
    ":hover": {
      filter: "brightness(1.05)",
      textDecorationLine: "none",
    },
  },
});

export default function Forbidden() {
  return (
    <main {...stylex.props(styles.main)}>
      <div {...stylex.props(styles.content)}>
        <div {...stylex.props(styles.iconChip)}>
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true">
            <rect
              x="4.5"
              y="10.5"
              width="15"
              height="10"
              rx="2.2"
            />
            <path d="M8 10.5V7.5a4 4 0 018 0v3" />
            <circle
              cx="12"
              cy="15"
              r="1.4"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </div>
        <span {...stylex.props(styles.eyebrow)}>Error 401</span>
        <h1 {...stylex.props(styles.heading)}>You&apos;re not authorized to view this</h1>
        <p {...stylex.props(styles.description)}>
          You don&apos;t have permission to access this page. If you think this is a mistake, contact your
          workspace admin or head back home to keep working.
        </p>
        <Link
          href="/"
          xstyle={styles.cta}>
          <IconHome
            width={17}
            height={17}
          />
          Back to home
        </Link>
      </div>
    </main>
  );
}