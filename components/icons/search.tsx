export default function Search({
  width = 15,
  height = 15,
  title = "Search Icon",
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
      strokeWidth={1.6}
      aria-hidden="true">
      <title>{title}</title>
      <circle
        cx="7"
        cy="7"
        r="4.5"
      />
      <path
        d="M10.5 10.5L14 14"
        strokeLinecap="round"
      />
    </svg>
  );
}