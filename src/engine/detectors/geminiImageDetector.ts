import { loadAlphaMap } from "../core/alphaMaps";
import { nccAt, scanBottomRightNCC } from "../core/math";
import type { AlphaMap, DetectionResult } from "../core/types";

const NCC_THRESHOLD = 0.25;
const NCC_GOOD = 0.5;
const GAIN_DRIFT = 0.62;
const SCAN_STRIDE = 8;
const REFINE_RADIUS = 8;

interface SizeCandidate {
  side: number;
  margin: number;
  key: "small" | "large";
}

const CANDIDATES: SizeCandidate[] = [
  { side: 96, margin: 64, key: "large" },
  { side: 48, margin: 32, key: "small" },
];

/**
 * Detect Gemini sparkle watermark in the bottom-right ROI.
 * Tries both 48px and 96px templates; falls back to NCC scan if auto position is weak.
 */
export async function detectGeminiImageWatermark(
  imageData: ImageData
): Promise<DetectionResult> {
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  const maps = await Promise.all(
    CANDIDATES.map(async (c) => ({
      ...c,
      alphaMap: await loadAlphaMap(c.key, c.side, "luma"),
    }))
  );

  let best: {
    side: number;
    alphaMap: AlphaMap;
    x: number;
    y: number;
    ncc: number;
    autoX: number;
    autoY: number;
    method: string;
  } | null = null;

  for (const cfg of maps) {
    const autoX = w - cfg.margin - cfg.side;
    const autoY = h - cfg.margin - cfg.side;
    let entry = {
      side: cfg.side,
      alphaMap: cfg.alphaMap,
      x: autoX,
      y: autoY,
      ncc: nccAt(data, w, h, cfg.alphaMap.values, cfg.side, autoX, autoY),
      autoX,
      autoY,
      method: "auto",
    };

    if (entry.ncc < NCC_GOOD) {
      const scan = scanBottomRightNCC(
        data,
        w,
        h,
        cfg.alphaMap.values,
        cfg.side,
        SCAN_STRIDE,
        REFINE_RADIUS
      );
      if (scan.ncc > entry.ncc) {
        entry = {
          ...entry,
          x: scan.x,
          y: scan.y,
          ncc: scan.ncc,
          method: "scan",
        };
      }
    }

    if (!best || entry.ncc > best.ncc) best = entry;
  }

  if (!best || best.ncc < NCC_THRESHOLD) {
    return {
      detected: false,
      variant: "none",
      confidence: best?.ncc ?? 0,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      side: 0,
      gain: 1,
      method: "none",
    };
  }

  const drifted = best.x !== best.autoX || best.y !== best.autoY;
  const gain = drifted ? GAIN_DRIFT : 1;

  return {
    detected: true,
    variant: best.side >= 96 ? "gemini-sparkle-large" : "gemini-sparkle",
    confidence: best.ncc,
    x: best.x,
    y: best.y,
    width: best.side,
    height: best.side,
    side: best.side,
    gain,
    method: best.method,
    alphaMap: best.alphaMap,
  };
}
