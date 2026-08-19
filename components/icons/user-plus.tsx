export default function UserPlus({
  width = 16,
  height = 16,
  title = "User Plus Icon",
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
        d="M10.5 11.5c0-2.21-1.79-4-4-4s-4 1.79-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="6.5"
        cy="5"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M13 4v4M11 6h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}