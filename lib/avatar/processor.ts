import sharp from "sharp";

const maximumInputBytes = 5 * 1024 * 1024;
const maximumInputDimension = 4096;
const maximumOutputDimension = 512;
const maximumOutputBytes = 1024 * 1024;

export type AvatarProcessingErrorCode =
  | "input-too-large"
  | "invalid-content"
  | "type-mismatch"
  | "dimensions-too-large"
  | "animated"
  | "output-too-large";

export class AvatarProcessingError extends Error {
  constructor(
    public readonly code: AvatarProcessingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AvatarProcessingError";
  }
}

export type ProcessedAvatar = {
  bytes: Buffer;
  contentType: "image/jpeg" | "image/png";
  extension: "jpg" | "png";
  width: number;
  height: number;
};

export async function processAvatar(bytes: Buffer, declaredContentType: string): Promise<ProcessedAvatar> {
  if (bytes.length > maximumInputBytes) {
    throw new AvatarProcessingError("input-too-large", "Avatar input must not exceed 5 MB");
  }
  const image = sharp(bytes, { animated: true, failOn: "error" });
  const metadata = await image.metadata().catch(() => {
    throw new AvatarProcessingError("invalid-content", "Avatar content could not be decoded");
  });
  const contentType =
    metadata.format === "jpeg" ? "image/jpeg" : metadata.format === "png" ? "image/png" : null;
  if (!contentType || contentType !== declaredContentType) {
    throw new AvatarProcessingError(
      "type-mismatch",
      "Avatar decoded type does not match JPEG or PNG input type",
    );
  }
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > maximumInputDimension ||
    metadata.height > maximumInputDimension
  ) {
    throw new AvatarProcessingError(
      "dimensions-too-large",
      "Avatar dimensions must not exceed 4096 by 4096 pixels",
    );
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new AvatarProcessingError("animated", "Animated avatars are not supported");
  }

  const pipeline = sharp(bytes).rotate().resize({
    width: maximumOutputDimension,
    height: maximumOutputDimension,
    fit: "inside",
    withoutEnlargement: true,
  });
  const result =
    contentType === "image/jpeg"
      ? await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true })
      : await pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  if (result.data.length > maximumOutputBytes) {
    throw new AvatarProcessingError("output-too-large", "Processed avatar must not exceed 1 MB");
  }
  return {
    bytes: result.data,
    contentType,
    extension: contentType === "image/jpeg" ? "jpg" : "png",
    width: result.info.width,
    height: result.info.height,
  };
}