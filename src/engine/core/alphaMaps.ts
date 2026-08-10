import type { AlphaMap } from "./types";

const cache = new Map<string, AlphaMap>();

const MASK_URLS = {
  small: "/masks/sparkle_48.png",
  large: "/masks/sparkle_96.png",
  video1080: "/masks/sparkle_1080.png",
} as const;

export type MaskKey = keyof typeof MASK_URLS;

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load mask: ${url}`));
    img.src = url;
  });
}

function extractAlpha(
  pixels: ImageData,
  mode: "luma" | "alpha" | "rgba"
): AlphaMap {
  const { width, height, data } = pixels;
  const count = width * height;
  const values = new Float32Array(count);
  let colorValues: Float32Array | undefined;

  if (mode === "rgba") {
    colorValues = new Float32Array(count * 3);
  }

  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (mode === "alpha") {
      values[i] = data[o + 3] / 255;
    } else if (mode === "rgba") {
      values[i] = data[o + 3] / 255;
      colorValues![i * 3] = data[o];
      colorValues![i * 3 + 1] = data[o + 1];
      colorValues![i * 3 + 2] = data[o + 2];
    } else {
      values[i] = Math.max(data[o], data[o + 1], data[o + 2]) / 255;
    }
  }

  return { values, side: width, colorValues };
}

export async function loadAlphaMap(
  key: MaskKey,
  targetSize?: number,
  mode: "luma" | "alpha" | "rgba" = "luma"
): Promise<AlphaMap> {
  const size = targetSize ?? 0;
  const cacheKey = `${key}@${size || "native"}:${mode}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const img = await loadImage(MASK_URLS[key]);
  const outSize = size > 0 ? size : img.naturalWidth;
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, outSize, outSize);
  const pixels = ctx.getImageData(0, 0, outSize, outSize);
  const map = extractAlpha(pixels, mode);
  cache.set(cacheKey, map);
  return map;
}

export async function preloadDetectionMaps(): Promise<
  Array<{ side: number; margin: number; key: MaskKey; alphaMap: AlphaMap }>
> {
  const configs: Array<{ side: number; margin: number; key: MaskKey }> = [
    { side: 144, margin: 96, key: "large" },
    { side: 96, margin: 64, key: "large" },
    { side: 48, margin: 32, key: "small" },
  ];

  const out = [];
  for (const cfg of configs) {
    const alphaMap = await loadAlphaMap(cfg.key, cfg.side, "luma");
    out.push({ ...cfg, alphaMap });
  }
  return out;
}
