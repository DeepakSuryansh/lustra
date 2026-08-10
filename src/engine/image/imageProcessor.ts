import { detectGeminiImageWatermark } from "../detectors/geminiImageDetector";
import { reverseBlendInPlace } from "../core/math";
import type { ImageMeta, ProcessResult, ProgressCallback } from "../core/types";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/bmp",
]);

export function isImageFile(file: File): boolean {
  if (IMAGE_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
}

async function decodeToImageData(
  file: File
): Promise<{ imageData: ImageData; mimeType: string; hasAlpha: boolean }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D unavailable");
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  bitmap.close();

  let hasAlpha = false;
  if (file.type === "image/png" || file.type === "image/webp") {
    const d = imageData.data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
  }

  return { imageData, mimeType: file.type || "image/png", hasAlpha };
}

async function exportImage(
  imageData: ImageData,
  mimeType: string,
  originalName: string
): Promise<{ blob: Blob; filename: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.putImageData(imageData, 0, 0);

  const base = originalName.replace(/\.[^.]+$/, "") || "cleaned";
  // Prefer lossless PNG for reconstructed pixels; preserve JPEG only when source was JPEG and no alpha needed
  const preferPng =
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "image/bmp" ||
    mimeType === "";

  if (preferPng) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG export failed"))),
        "image/png"
      );
    });
    return { blob, filename: `${base}-clean.png` };
  }

  // High-quality JPEG when source was JPEG
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("JPEG export failed"))),
      "image/jpeg",
      0.95
    );
  });
  return { blob, filename: `${base}-clean.jpg` };
}

function validateImageOutput(
  out: ImageData,
  source: ImageData
): void {
  if (out.width !== source.width || out.height !== source.height) {
    throw new Error("Output dimensions do not match source");
  }
  if (!out.data || out.data.length !== source.data.length) {
    throw new Error("Output image data is corrupt");
  }
}

export async function processImageFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ProcessResult> {
  const report = (stage: string, ratio: number, message?: string) =>
    onProgress?.({ stage, ratio, message });

  report("analyzing", 0.05, "Reading image…");
  const { imageData, mimeType, hasAlpha } = await decodeToImageData(file);

  const meta: ImageMeta = {
    kind: "image",
    width: imageData.width,
    height: imageData.height,
    mimeType,
    fileSize: file.size,
    hasAlpha,
  };

  report("detecting", 0.25, "Scanning watermark region…");
  const detection = await detectGeminiImageWatermark(imageData);

  if (!detection.detected || !detection.alphaMap) {
    report("done", 1, "No supported watermark detected");
    // Return original unchanged — never re-encode clean files
    return {
      blob: file,
      filename: file.name,
      removed: false,
      message: "No supported watermark detected — file unchanged.",
      meta,
    };
  }

  report("removing", 0.55, "Reconstructing pixels…");
  // Work on a copy so we never mutate intermediate state incorrectly
  const working = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  reverseBlendInPlace(
    working,
    {
      x: detection.x,
      y: detection.y,
      w: detection.width,
      h: detection.height,
    },
    detection.alphaMap,
    { gain: detection.gain }
  );

  validateImageOutput(working, imageData);

  report("exporting", 0.85, "Encoding output…");
  const { blob, filename } = await exportImage(working, mimeType, file.name);

  report("done", 1, "Watermark removed");
  return {
    blob,
    filename,
    removed: true,
    message: `Removed ${detection.variant} (confidence ${(detection.confidence * 100).toFixed(0)}%)`,
    meta,
  };
}
