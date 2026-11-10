const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

/**
 * Schneidet ein Profilbild mittig quadratisch zu und verkleinert es (max. 512 px).
 * So bleibt jeder Upload weit unter dem 5-MB-Limit des Buckets, auch bei Handyfotos.
 * Nur im Browser nutzbar.
 */
export async function prepareAvatar(file: File, size = 512): Promise<Blob> {
  if (!ACCEPTED.includes(file.type))
    throw new Error("Bitte nutze ein JPG-, PNG- oder WebP-Bild.");
  if (file.size > MAX_INPUT_BYTES)
    throw new Error(
      "Das Bild ist größer als 20 MB. Bitte wähle ein kleineres.",
    );
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Dieses Bild konnte nicht gelesen werden.");
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const target = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Dieses Bild konnte nicht verarbeitet werden.");
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      target,
      target,
    );
    const webp = await toBlob(canvas, "image/webp", 0.9);
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await toBlob(canvas, "image/jpeg", 0.9);
    if (jpeg) return jpeg;
    throw new Error("Dieses Bild konnte nicht verarbeitet werden.");
  } finally {
    bitmap.close();
  }
}
