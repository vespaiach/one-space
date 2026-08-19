export default function Home({
  width = 16,
  height = 16,
  title = "Home Icon",
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
        d="M2 7L8 2l6 5v7H10v-4H6v4H2V7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}