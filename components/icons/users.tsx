export default function Users({
  width = 16,
  height = 16,
  title = "Users Icon",
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
      <circle
        cx="6"
        cy="5.5"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1.8 13c0-2.6 2-4 4.2-4s4.2 1.4 4.2 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 3.5a2.2 2.2 0 010 4.1M11.2 12.6c0-1.8-.7-3-1.9-3.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}