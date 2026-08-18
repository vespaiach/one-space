import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import { validatePasswordResetIntake } from "@/lib/password-reset/service";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = readRuntimeConfig();
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await validatePasswordResetIntake(db, token, config.tokenEncryptionKey);
  const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (result.status === "invalid") {
    await checkRateLimit(db, {
      scope: "token_validation_source",
      key: source,
      hashKey: config.rateLimitHashKey,
    });
  }
  const response = NextResponse.redirect(
    new URL(result.status === "valid" ? "/reset-password" : "/reset-password?invalid=true", request.url),
  );
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  if (result.status === "valid") {
    response.cookies.set("password_reset_flow", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/reset-password",
      expires: result.expiresAt,
    });
  }
  return response;
}