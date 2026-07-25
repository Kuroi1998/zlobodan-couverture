import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { detectMimeFromMagicBytes } from "./magic-bytes";
import { recordSecurityEvent } from "./security-events";

/**
 * Traitement sécurisé des fichiers déposés.
 *
 * Durcissements par rapport à la version précédente :
 *  - le répertoire n'est plus créé à l'import du module, ce qui s'exécutait
 *    pendant la compilation et échouait sur un système de fichiers en lecture
 *    seule (audit M2) ;
 *  - `sharp` est borné en nombre de pixels, sinon une image très compressée de
 *    quelques kilooctets peut se décompresser en plusieurs gigaoctets ;
 *  - les lots sont bornés en nombre et en poids cumulé.
 */

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 8;
const MAX_BATCH_BYTES = 30 * 1024 * 1024;

/** ~25 mégapixels : au-delà, on est hors du cas d'usage « photo de chantier ». */
const MAX_INPUT_PIXELS = 25_000_000;

/** Une image ne dépasse pas cette dimension après ré-encodage. */
const MAX_DIMENSION = 2500;

export interface UploadResult {
  fileId: string;
  storagePath: string;
  mimeType: string;
  size: number;
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

/** Création paresseuse : au premier dépôt réel, jamais à l'import. */
async function ensureUploadDir(): Promise<void> {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Journalise puis *retourne* l'erreur à lever, pour que les appelants écrivent
 * `throw await reject(...)`. TypeScript sait alors que le flot s'arrête là et
 * peut affiner les types sur les lignes suivantes.
 */
async function reject(reason: string, message: string): Promise<UploadRejected> {
  await recordSecurityEvent({
    kind: "UPLOAD_REJECTED",
    severity: "medium",
    detail: { reason },
  });
  return new UploadRejected(reason, message);
}

export async function processSecureUpload(fileBuffer: Buffer): Promise<UploadResult> {
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw await reject("too-large", "Le fichier dépasse la taille maximale autorisée de 10 Mo.");
  }

  // Type déterminé par les octets d'en-tête, jamais par l'extension ni par le
  // `Content-Type` annoncé, tous deux fournis par le client.
  const detectedMime = detectMimeFromMagicBytes(fileBuffer);
  if (!detectedMime) {
    throw await reject(
      "unsupported-type",
      "Type de fichier non autorisé. Formats acceptés : PNG, JPEG, WebP, PDF."
    );
  }

  const fileId = crypto.randomUUID();
  const fileChecksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  let processedBuffer = fileBuffer;
  let extension = "bin";

  if (detectedMime.startsWith("image/")) {
    // Le ré-encodage purge les métadonnées EXIF, dont la géolocalisation du
    // domicile du client, et neutralise une charge utile dissimulée dans un
    // segment de commentaire.
    const pipeline = sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true });

    try {
      if (detectedMime === "image/jpeg") {
        processedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
        extension = "jpg";
      } else if (detectedMime === "image/png") {
        processedBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
        extension = "png";
      } else {
        processedBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
        extension = "webp";
      }
    } catch {
      throw await reject("image-processing-failed", "Cette image n'a pas pu être traitée.");
    }
  } else {
    extension = "pdf";
  }

  await ensureUploadDir();

  // Nom de fichier entièrement généré : ni l'extension ni le nom d'origine du
  // client n'entrent dans le chemin, ce qui ferme la traversée de répertoire.
  const targetPath = path.join(UPLOAD_DIR, `${fileId}.${extension}`);

  // Ceinture et bretelles : on vérifie que le chemin résolu reste bien sous le
  // répertoire de destination.
  if (!path.resolve(targetPath).startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    throw await reject("path-escape", "Chemin de stockage invalide.");
  }

  await fs.promises.writeFile(targetPath, processedBuffer, { mode: 0o640 });

  return {
    fileId,
    storagePath: targetPath,
    mimeType: detectedMime,
    size: processedBuffer.length,
    checksum: fileChecksum,
  };
}

/** Contrôle du lot avant tout traitement unitaire. */
export async function assertBatchWithinLimits(files: { size: number }[]): Promise<void> {
  if (files.length > MAX_FILES_PER_BATCH) {
    throw await reject("too-many-files", `Maximum ${MAX_FILES_PER_BATCH} fichiers par envoi.`);
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
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
