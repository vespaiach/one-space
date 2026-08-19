export default function Bell({
  width = 16,
  height = 16,
  title = "Bell Icon",
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
      aria-hidden="true">
      <title>{title}</title>
      <path
        d="M6 13a2 2 0 0 0 4 0M8 2.5a4.5 4.5 0 0 1 4.5 4.5c0 2.5.9 3.7 1.5 4.5H2c.6-.8 1.5-2 1.5-4.5A4.5 4.5 0 0 1 8 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}