import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { detectMimeFromMagicBytes, type AllowedMimeType } from "./magic-bytes";
import { recordSecurityEvent } from "./security-events";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 5;
const MAX_BATCH_BYTES = 30 * 1024 * 1024;
const MAX_INPUT_PIXELS = 25_000_000;
const MAX_DIMENSION = 2500;

const MIME_EXTENSIONS: Record<AllowedMimeType, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const OUTPUT_EXTENSIONS: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface SecureUploadInput {
  buffer: Buffer;
  originalName: string;
}

export interface PreparedUpload {
  buffer: Buffer;
  storageKey: string;
  originalName: string;
  storedName: string;
  mimeType: AllowedMimeType;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  checksum: string;
}

export class UploadRejected extends Error {
  readonly reason: string;

  constructor(reason: string, message: string) {
    super(message);
    this.name = "UploadRejected";
    this.reason = reason;
  }
}

async function reject(reason: string, message: string): Promise<UploadRejected> {
  await recordSecurityEvent({
    kind: "UPLOAD_REJECTED",
    severity: "medium",
    detail: { reason },
  });
  return new UploadRejected(reason, message);
}

function safeOriginalName(value: string): string {
  const base = path.basename(value).normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "");
  return base.trim().slice(0, 255) || "fichier";
}

function hasPlausiblePdfTerminator(buffer: Buffer): boolean {
  const eof = buffer.lastIndexOf(Buffer.from("%%EOF"));
  return eof >= 0 && buffer.length - (eof + 5) <= 1024;
}

export async function prepareSecureUpload(input: SecureUploadInput): Promise<PreparedUpload> {
  if (input.buffer.length === 0) {
    throw await reject("empty", "Le fichier est vide.");
  }
  if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
    throw await reject("too-large", "Le fichier dépasse la taille maximale autorisée de 10 Mo.");
  }

  const detectedMime = detectMimeFromMagicBytes(input.buffer);
  if (!detectedMime) {
    throw await reject(
      "unsupported-type",
      "Type de fichier non autorisé. Formats acceptés : PNG, JPEG, WebP, PDF."
    );
  }

  const originalName = safeOriginalName(input.originalName);
  const originalExtension = path.extname(originalName).toLowerCase();
  if (!MIME_EXTENSIONS[detectedMime].includes(originalExtension)) {
    throw await reject(
      "extension-mismatch",
      "L'extension du fichier ne correspond pas à son contenu."
    );
  }

  if (detectedMime === "application/pdf" && !hasPlausiblePdfTerminator(input.buffer)) {
    throw await reject("invalid-pdf", "Le document PDF est incomplet ou invalide.");
  }

  let processedBuffer = input.buffer;
  let width: number | null = null;
  let height: number | null = null;

  if (detectedMime.startsWith("image/")) {
    const pipeline = sharp(input.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });

    try {
      if (detectedMime === "image/jpeg") {
        processedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
      } else if (detectedMime === "image/png") {
        processedBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
      } else {
        processedBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
      }
      const metadata = await sharp(processedBuffer).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
    } catch {
      throw await reject("image-processing-failed", "Cette image n'a pas pu être traitée.");
    }
  }

  const fileId = crypto.randomUUID();
  const extension = OUTPUT_EXTENSIONS[detectedMime];
  const storedName = `${fileId}.${extension}`;
  const now = new Date();
  const storageKey = [
    "quote-attachments",
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    storedName,
  ].join("/");

  return {
    buffer: processedBuffer,
    storageKey,
    originalName,
    storedName,
    mimeType: detectedMime,
    sizeBytes: processedBuffer.length,
    width,
    height,
    checksum: crypto.createHash("sha256").update(processedBuffer).digest("hex"),
  };
}

export async function assertBatchWithinLimits(files: { size: number }[]): Promise<void> {
  if (files.length > MAX_FILES_PER_BATCH) {
    throw await reject("too-many-files", `Maximum ${MAX_FILES_PER_BATCH} fichiers par envoi.`);
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_BATCH_BYTES) {
    throw await reject("batch-too-large", "Le poids total des fichiers est trop important.");
  }
}

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_BATCH,
  MAX_BATCH_BYTES,
  MAX_INPUT_PIXELS,
};
