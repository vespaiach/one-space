import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processAvatar } from "@/lib/avatar/processor";

async function png(width = 800, height = 400) {
  return sharp({ create: { width, height, channels: 3, background: "red" } }).png().withMetadata({ orientation: 6 }).toBuffer();
}

async function jpeg(width = 800, height = 400) {
  return sharp({ create: { width, height, channels: 3, background: "blue" } }).jpeg().toBuffer();
}

describe("avatar processor", () => {
  it("decodes, strips metadata, preserves aspect ratio, and bounds output", async () => {
    const result = await processAvatar(await png(), "image/png");
    expect(result.contentType).toBe("image/png");
    expect(result.extension).toBe("png");
    expect(result.width).toBeLessThanOrEqual(512);
    expect(result.height).toBeLessThanOrEqual(512);
    expect(result.bytes.length).toBeLessThanOrEqual(1024 * 1024);
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.orientation).toBeUndefined();
  });

  it("accepts JPEG plus exact byte and dimension boundaries while removing appended active content", async () => {
    await expect(processAvatar(await jpeg(), "image/jpeg")).resolves.toMatchObject({ contentType: "image/jpeg" });
    const boundary = await processAvatar(await png(4096, 1), "image/png");
    expect(Math.max(boundary.width, boundary.height)).toBe(512);
    const base = await png(20, 20);
    const activeContent = Buffer.from("<script>alert(1)</script>");
    const padded = Buffer.concat([base, activeContent, Buffer.alloc(5 * 1024 * 1024 - base.length - activeContent.length)]);
    const processed = await processAvatar(padded, "image/png");
    expect(processed.bytes.includes(activeContent)).toBe(false);
  });

  it("rejects corrupt, MIME-mismatched, oversized, and over-dimension input", async () => {
    await expect(processAvatar(Buffer.from("not-image"), "image/png")).rejects.toThrow();
    await expect(processAvatar(await png(), "image/jpeg")).rejects.toThrow(/type/i);
    await expect(processAvatar(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png")).rejects.toThrow(/5 MB/i);
    await expect(processAvatar(await png(4097, 1), "image/png")).rejects.toThrow(/4096/i);
  });
});
