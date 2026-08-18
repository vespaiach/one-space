export function avatarResponseHeaders(contentType: "image/jpeg" | "image/png"): Headers {
  return new Headers({
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
}