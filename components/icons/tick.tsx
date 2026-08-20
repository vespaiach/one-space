export default function Tick({
  width = 16,
  height = 16,
  title = "Tick Icon",
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
      strokeLinecap="round"
      strokeLinejoin="round">
      <title>{title}</title>
      <path
        data-dc-tpl="25"
        d="M3 8.5l3.2 3.2L13 5"></path>
    </svg>
  );
}