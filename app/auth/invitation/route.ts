import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import { processInvitationIntake } from "@/lib/invitations/intake";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = readRuntimeConfig();
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await processInvitationIntake(db, {
    token,
    tokenKey: config.tokenEncryptionKey,
    hashKey: config.rateLimitHashKey,
    source,
  });
  const destination = new URL(
    result.status === "valid" ? "/register" : "/register?invalid=true",
    request.url,
  );
  const response = NextResponse.redirect(destination);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  if (result.status === "valid") {
    response.cookies.set("invitation_flow", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/register",
      expires: result.expiresAt,
    });
  }
  return response;
}