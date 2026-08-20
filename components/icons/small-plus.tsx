export default function SmallPlus({
  width = 14,
  height = 14,
  title = "Small Plus Icon",
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
        d="M7 2v10M2 7h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}