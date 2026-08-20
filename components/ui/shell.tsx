"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import IconBell from "@/components/icons/bell";
import IconHome from "@/components/icons/home";
import IconLogo from "@/components/icons/logo";
import IconLogOut from "@/components/icons/logout";
import IconSmallPlus from "@/components/icons/small-plus";
import IconUsers from "@/components/icons/users";
import { colors, layer, layout, motion, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: structure.flex,
    minHeight: structure.minHeightScreen,
  },

  navSeparator: {
    paddingLeft: space.s4,
    paddingRight: space.s4,
  },

  navSeparatorLine: {
    borderTopWidth: "1px",
    borderTopStyle: structure.borderSolid,
    borderTopColor: colors.sidebarBorder,
  },

  sidebar: {
    width: layout.sidebarWidth,
    minHeight: structure.minHeightScreen,
    position: "fixed",
    top: 0,
    left: 0,
    backgroundColor: colors.sidebar,
    borderRightWidth: "1px",
    borderRightStyle: structure.borderSolid,
    borderRightColor: colors.sidebarBorder,
    display: structure.flex,
    flexDirection: "column",
    zIndex: layer.sticky,
  },

  sidebarScroll: {
    flex: 1,
    overflowY: "auto",
    display: structure.flex,
    flexDirection: "column",
  },

  logoArea: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s3,
    padding: space.s5,
    paddingBottom: space.s4,
  },

  logoIcon: {
    width: "36px",
    height: "36px",
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    fontSize: type.sizeSm,
    fontWeight: type.weightSemibold,
    flexShrink: 0,
    letterSpacing: type.trackingWide,
  },

  logoName: {
    fontSize: type.sizeBase,
    fontWeight: type.weightSemibold,
    color: colors.foreground,
    lineHeight: type.leadingTight,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  logoTagline: {
    fontSize: type.sizeXs,
    color: colors.textSecondary,
    lineHeight: type.leadingTight,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  navSection: {
    paddingInline: space.s3,
    paddingBlock: space.s2,
  },

  navItem: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s3,
    paddingBlock: space.s3,
    paddingInline: space.s4,
    borderRadius: radius.md,
    fontSize: type.sizeBase,
    fontWeight: type.weightMedium,
    color: colors.textBody,
    width: "100%",
    transitionProperty: "background-color, color",
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.easeStandard,
    ":hover": {
      backgroundColor: colors.accent,
    },
  },

  navItemActive: {
    backgroundColor: colors.primaryTint,
    color: colors.primary,
    fontWeight: type.weightSemibold,
    ":hover": {
      backgroundColor: colors.primaryTint,
    },
  },

  navBadge: {
    marginLeft: structure.auto,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    borderRadius: radius.full,
    minWidth: "18px",
    height: "18px",
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    paddingInline: space.s1,
    lineHeight: "1",
  },

  navCount: {
    marginLeft: structure.auto,
    fontSize: type.size2xs,
    color: colors.mutedForeground,
    fontVariantNumeric: "tabular-nums",
  },

  projectsSection: {
    paddingInline: space.s4,
    paddingTop: space.s4,
    paddingBottom: space.s2,
  },

  projectsHeader: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.justifyBetween,
    paddingInline: space.s2,
    marginBottom: space.s2,
  },

  projectsLabel: {
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWider,
    color: colors.mutedForeground,
    textTransform: "uppercase",
  },

  projectAddBtn: {
    width: "20px",
    height: "20px",
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    borderRadius: radius.xs,
    color: colors.mutedForeground,
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.foreground,
    },
  },

  projectItem: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    paddingBlock: "5px",
    paddingInline: space.s2,
    borderRadius: radius.sm,
    width: "100%",
    transitionProperty: "background-color",
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.easeStandard,
    ":hover": {
      backgroundColor: colors.accent,
    },
  },

  projectDot: {
    width: "8px",
    height: "8px",
    borderRadius: radius.full,
    flexShrink: 0,
  },

  projectKey: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    fontWeight: type.weightMedium,
    width: "28px",
    flexShrink: 0,
  },

  projectName: {
    flex: 1,
    fontSize: type.sizeSm,
    color: colors.foreground,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
  },

  projectCount: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    flexShrink: 0,
  },

  bottomNavSection: {
    paddingInline: space.s3,
    paddingBlock: space.s2,
    marginTop: space.s3,
  },

  userArea: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s3,
    padding: space.s4,
    borderTopWidth: "1px",
    borderTopStyle: structure.borderSolid,
    borderTopColor: colors.sidebarBorder,
  },

  userAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    fontSize: type.sizeXs,
    fontWeight: type.weightSemibold,
    flexShrink: 0,
    lineHeight: "1",
  },

  userInfo: {
    flex: 1,
    overflow: "hidden",
  },

  userName: {
    fontSize: type.sizeSm,
    fontWeight: type.weightMedium,
    color: colors.foreground,
    lineHeight: type.leadingTight,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  userRole: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    lineHeight: type.leadingTight,
  },

  logoutBtn: {
    width: "28px",
    height: "28px",
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    borderRadius: radius.sm,
    color: colors.mutedForeground,
    flexShrink: 0,
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.foreground,
    },
  },

  contentWrapper: {
    flex: 1,
    marginLeft: layout.sidebarWidth,
    display: structure.flex,
    flexDirection: "column",
    minHeight: structure.minHeightScreen,
  },

  topBar: {
    height: layout.headerHeight,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.justifyBetween,
    paddingInline: space.s7,
    backgroundColor: colors.background,
    borderBottomWidth: "1px",
    borderBottomStyle: structure.borderSolid,
    borderBottomColor: colors.borderSoft,
    position: "sticky",
    top: 0,
    zIndex: layer.sticky,
    flexShrink: 0,
  },

  topBarRight: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s4,
  },

  memberAvatars: {
    display: structure.flex,
    alignItems: structure.alignCenter,
  },

  memberAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: radius.full,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    color: "white",
    borderWidth: "2px",
    borderStyle: structure.borderSolid,
    borderColor: colors.background,
    marginLeft: "-8px",
    flexShrink: 0,
  },

  memberAvatarFirst: {
    marginLeft: space.s0,
  },

  addBtn: {
    width: "32px",
    height: "32px",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    flexShrink: 0,
    ":hover": {
      opacity: 0.85,
    },
  },

  main: {
    flex: 1,
  },
});

type ShellProps = {
  children: React.ReactNode;
  isAdmin?: boolean;
  projects?: Array<{
    key: string;
    name: string;
    color: string;
    issueCount: number;
  }>;
  members?: Array<{
    initials: string;
    bg: string;
  }>;
  notificationCount?: number;
  memberCount?: number;
};

export function Shell({
  children,
  isAdmin = false,
  projects = [],
  members = [],
  notificationCount = 0,
  memberCount = 0,
}: ShellProps) {
  const pathname = usePathname();

  return (
    <div {...stylex.props(styles.root)}>
      <aside
        {...stylex.props(styles.sidebar)}
        aria-label="Sidebar">
        <div {...stylex.props(styles.sidebarScroll)}>
          <div {...stylex.props(styles.logoArea)}>
            <IconLogo
              width={28}
              height={28}
            />
            <div>
              <div {...stylex.props(styles.logoName)}>One Space</div>
              <div {...stylex.props(styles.logoTagline)}>One Space, One Team</div>
            </div>
          </div>

          <nav
            {...stylex.props(styles.navSection)}
            aria-label="Primary">
            <Link
              href="/"
              {...stylex.props(styles.navItem, pathname === "/" && styles.navItemActive)}>
              <IconHome />
              Home
            </Link>
          </nav>

          <div {...stylex.props(styles.navSeparator)}>
            <hr {...stylex.props(styles.navSeparatorLine)} />
          </div>

          <nav {...stylex.props(styles.projectsSection)}>
            <div {...stylex.props(styles.projectsHeader)}>
              <span {...stylex.props(styles.projectsLabel)}>Projects</span>
              {isAdmin && (
                <Link
                  href="/projects/new"
                  {...stylex.props(styles.projectAddBtn)}
                  aria-label="Add project">
                  <IconSmallPlus />
                </Link>
              )}
            </div>
            <ul>
              {projects.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    {...stylex.props(styles.projectItem)}>
                    <span
                      {...stylex.props(styles.projectDot)}
                      style={{ backgroundColor: p.color }}
                    />
                    <span {...stylex.props(styles.projectKey)}>{p.key}</span>
                    <span {...stylex.props(styles.projectName)}>{p.name}</span>
                    <span {...stylex.props(styles.projectCount)}>{p.issueCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div {...stylex.props(styles.navSeparator)}>
            <hr {...stylex.props(styles.navSeparatorLine)} />
          </div>

          <nav
            {...stylex.props(styles.bottomNavSection)}
            aria-label="Secondary">
            <Link
              href="/notifications"
              {...stylex.props(
                styles.navItem,
                pathname.startsWith("/notifications") && styles.navItemActive,
              )}>
              <IconBell />
              Notifications
              <span {...stylex.props(styles.navBadge)}>{notificationCount}</span>
            </Link>
            {isAdmin && (
              <Link
                href="/users"
                {...stylex.props(styles.navItem, pathname.startsWith("/users") && styles.navItemActive)}>
                <IconUsers />
                Members
                <span {...stylex.props(styles.navCount)}>{memberCount}</span>
              </Link>
            )}
          </nav>
        </div>

        <div {...stylex.props(styles.userArea)}>
          <div
            {...stylex.props(styles.userAvatar)}
            aria-hidden="true">
            MA
          </div>
          <div {...stylex.props(styles.userInfo)}>
            <div {...stylex.props(styles.userName)}>Mara Ellison</div>
            <div {...stylex.props(styles.userRole)}>{isAdmin ? "Admin" : "Member"}</div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              {...stylex.props(styles.logoutBtn)}
              aria-label="Log out">
              <IconLogOut />
            </button>
          </form>
        </div>
      </aside>

      <div {...stylex.props(styles.contentWrapper)}>
        <header {...stylex.props(styles.topBar)}>
          <div /> {/* page title slot — filled by page content */}
          <div {...stylex.props(styles.topBarRight)}>
            <div {...stylex.props(styles.memberAvatars)}>
              {members.map((m, i) => (
                <div
                  key={m.initials}
                  {...stylex.props(styles.memberAvatar, i === 0 && styles.memberAvatarFirst)}
                  style={{ backgroundColor: m.bg }}
                  title={m.initials}>
                  {m.initials}
                </div>
              ))}
            </div>
            <button
              type="button"
              {...stylex.props(styles.addBtn)}
              aria-label="Create new">
              <IconSmallPlus />
            </button>
          </div>
        </header>

        <main {...stylex.props(styles.main)}>{children}</main>
      </div>
    </div>
  );
}