export type AllowedMimeType = "image/png" | "image/jpeg" | "image/webp" | "application/pdf";

/**
 * Formats explicitement refusés, même s'ils sont des images valides.
 *
 * Un SVG est un document XML qui peut contenir `<script>`, des gestionnaires
 * `onload` et des références externes : servi depuis l'origine du site, c'est
 * une XSS stockée. Il n'est pas « détecté puis ignoré » par accident — il est
 * reconnu et refusé délibérément, pour que le refus soit testable et qu'un
 * futur élargissement des formats acceptés ne le laisse pas passer.
 */
export function looksLikeSvgOrXml(buffer: Buffer): boolean {
  // On n'examine que le début : un SVG peut être précédé d'une déclaration XML,
  // de commentaires ou d'espaces.
  const head = buffer.subarray(0, 1024).toString("utf8").trimStart().toLowerCase();
  return head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!doctype svg");
}

export function detectMimeFromMagicBytes(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 4) return null;

  // Refus explicite avant toute reconnaissance de format.
  if (looksLikeSvgOrXml(buffer)) return null;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // WebP: conteneur RIFF (52 49 46 46), puis le marqueur "WEBP" en octets 8-11.
  //
  // La version précédente comparait ces octets à 57 41 56 45, soit "WAVE" :
  // elle rejetait donc tous les vrais WebP et acceptait les fichiers audio WAV
  // comme des images (audit M3).
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer.length >= 12 &&
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  // PDF: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }

  return null;
}
