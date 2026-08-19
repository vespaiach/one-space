export default function Logout({
  width = 16,
  height = 16,
  title = "Logout Icon",
}: {
  width?: number;
  height?: number;
  title?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true">
      <title>{title}</title>
      <path
        d="M5 2H2.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H5M9.5 10l2.5-3-2.5-3M12 7H5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}