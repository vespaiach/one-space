export default function Markdown({
  width = 12,
  height = 12,
  title = "Markdown Icon",
}: {
  width?: number;
  height?: number;
  title?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true">
      <title>{title}</title>
      <rect
        x="1.5"
        y="3.5"
        width="13"
        height="9"
        rx="1.5"
      />
      <path d="M4 10V6l2 2 2-2v4M11 6v4M9.6 8.6L11 10l1.4-1.4" />
    </svg>
  );
}