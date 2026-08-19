import nodemailer from "nodemailer";
import type { Options } from "nodemailer/lib/mailer";
import type { RuntimeConfig } from "@/lib/config/env";

type MailTransport = {
  sendMail(message: Options): Promise<{ accepted?: unknown[]; rejected?: unknown[] }>;
};

export type EmailDeliveryResult = { status: "accepted" | "rejected" | "failed" };

let emailCapability: "ok" | "degraded" = "ok";

export function getEmailCapability(): "ok" | "degraded" {
  return emailCapability;
}

export function createSmtpAdapter(transport: MailTransport) {
  return {
    async send(message: Options): Promise<EmailDeliveryResult> {
      try {
        const result = await transport.sendMail(message);
        const status = Array.isArray(result.accepted) && result.accepted.length > 0 ? "accepted" : "rejected";
        emailCapability = status === "accepted" ? "ok" : "degraded";
        return { status };
      } catch {
        emailCapability = "degraded";
        return { status: "failed" };
      }
    },
  };
}

export function createConfiguredSmtpAdapter(config: RuntimeConfig["smtp"]) {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    ...(config.auth ? { auth: config.auth } : {}),
  });
  return createSmtpAdapter(transport);
}