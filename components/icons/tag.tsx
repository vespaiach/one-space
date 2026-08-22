export default function Tag({
  width = 13,
  height = 13,
  title = "Tag Icon",
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
      strokeWidth={1.5}
      aria-hidden="true">
      <title>{title}</title>
      <path d="M7.2 2.4H3.2A.8.8 0 002.4 3.2v4l6 6a1.1 1.1 0 001.6 0l3.4-3.4a1.1 1.1 0 000-1.6l-6-6z" />
      <circle
        cx="5.2"
        cy="5.2"
        r=".9"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}