import "@/styles/globals.css";
import * as stylex from "@stylexjs/stylex";
import { colors, font, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  body: {
    fontFamily: font.sans,
    fontSize: type.sizeBase,
    lineHeight: type.leadingNormal,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body {...stylex.props(styles.body)}>{children}</body>
    </html>
  );
}