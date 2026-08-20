export function CircleExclamation({
  width = 16,
  height = 16,
  title = "Exclamation Icon",
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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <title>{title}</title>
      <circle
        data-dc-tpl="28"
        cx="8"
        cy="8"
        r="6.4"></circle>
      <path
        data-dc-tpl="29"
        d="M8 7.2v3.6"></path>
      <circle
        data-dc-tpl="30"
        cx="8"
        cy="4.9"
        r=".4"
        fill="currentColor"
        stroke="none"></circle>
    </svg>
  );
}

export function TriangleExclamation({
  width = 16,
  height = 16,
  title = "Exclamation Icon",
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
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <title>{title}</title>
      <path
        data-dc-tpl="33"
        d="M8 1.8L14.6 13H1.4z"></path>
      <path
        data-dc-tpl="34"
        d="M8 6.4v3"></path>
      <circle
        data-dc-tpl="35"
        cx="8"
        cy="11"
        r=".4"
        fill="currentColor"
        stroke="none"></circle>
    </svg>
  );
}