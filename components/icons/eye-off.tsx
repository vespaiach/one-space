export default function EyeOff({
  width = 16,
  height = 16,
  title = "Eye Off Icon",
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
        d="M1.5 8S3.8 3.5 8 3.5 14.5 8 14.5 8 12.2 12.5 8 12.5 1.5 8 1.5 8z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="8"
        cy="8"
        r="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 2l12 12"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}