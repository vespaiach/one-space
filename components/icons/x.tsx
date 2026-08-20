export default function X({
  width = 16,
  height = 16,
  title = "X Icon",
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
      strokeWidth={2}
      strokeLinecap="round">
      <title>{title}</title>
      <path
        data-dc-tpl="38"
        d="M5 5l6 6M11 5l-6 6"></path>
    </svg>
  );
}