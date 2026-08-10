/**
 * Video watermark removal — reverse-alpha reconstruction + optional edge peel.
 *
 * Tuned for Gemini / Omni / Flow corner sparkles on 720p and 1080p.
 * Calibrated opacity + reverse-alpha; no full-region blur.
 */

import type { AlphaMap } from "../core/types";
import { clamp } from "../core/math";

export const OPACITY_LEVELS = [1, 0.62] as const;
export const OFFSETS_720 = [144, 120, 128, 72] as const;
export const OFFSETS_1080 = [222, 186] as const;

export interface CleanCandidate {
  x: number;
  y: number;
  alphaMap: AlphaMap;
  score: number;
  baseStrength: number;
  opacity?: number;
  ceiling?: number;
  overlayValue?: number;
  edgeCleanup?: { strength: number; radius: number } | null;
}

/** Pearson correlation between high-alpha mask pixels and local brightness. */
export function scorePosition(image: ImageData, cand: CleanCandidate): number {
  const mw = cand.alphaMap.side;
  const mh = cand.alphaMap.side;
  let sumGray = 0;
  let sumGraySq = 0;
  let sumA = 0;
  let sumASq = 0;
  let sumGA = 0;
  let n = 0;

  for (let row = 0; row < mh; row++) {
    for (let col = 0; col < mw; col++) {
      const a = cand.alphaMap.values[row * mw + col];
      if (a <= 0.08) continue;
      const idx = ((cand.y + row) * image.width + (cand.x + col)) * 4;
      const gray =
        (image.data[idx] + image.data[idx + 1] + image.data[idx + 2]) / 765;
      sumGray += gray;
      sumGraySq += gray * gray;
      sumA += a;
      sumASq += a * a;
      sumGA += gray * a;
      n++;
    }
  }
  if (n === 0) return -Infinity;
  const meanG = sumGray / n;
  const meanA = sumA / n;
  const denom = Math.sqrt(
    (sumGraySq - n * meanG * meanG) * (sumASq - n * meanA * meanA)
  );
  if (denom <= 0) return -Infinity;
  return (sumGA - n * meanG * meanA) / denom;
}

/**
 * Pick opacity (1.0 or 0.62) so reconstructed luma best matches surrounding field.
 * Color-mapped (1080p) watermarks always use full opacity.
 */
export function estimateOpacity(image: ImageData, cand: CleanCandidate): number {
  if (cand.alphaMap.colorValues !== undefined) return 1;

  const mw = cand.alphaMap.side;
  const mh = cand.alphaMap.side;
  const pad = Math.max(8, Math.round(0.25 * mw));
  const x0 = Math.max(0, cand.x - pad);
  const y0 = Math.max(0, cand.y - pad);
  const x1 = Math.min(image.width, cand.x + mw + pad);
  const y1 = Math.min(image.height, cand.y + mh + pad);

  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x >= cand.x && x < cand.x + mw && y >= cand.y && y < cand.y + mh) {
        continue;
      }
      const idx = (y * image.width + x) * 4;
      sum +=
        0.2126 * image.data[idx] +
        0.7152 * image.data[idx + 1] +
        0.0722 * image.data[idx + 2];
      n++;
    }
  }
  if (n === 0) return OPACITY_LEVELS[0];
  const surroundingLuma = sum / n;

  let bestOpacity: number = OPACITY_LEVELS[0];
  let bestError = Infinity;
  const hasColor = cand.alphaMap.colorValues !== undefined;
  const colorMap = cand.alphaMap.colorValues;
  const base = cand.baseStrength || 1;

  for (const op of OPACITY_LEVELS) {
    let errSum = 0;
    let weightSum = 0;
    for (let row = 0; row < mh; row++) {
      for (let col = 0; col < mw; col++) {
        const mi = row * mw + col;
        const a = cand.alphaMap.values[mi];
        if (a <= 0.04) continue;
        const p = Math.min(a * base * op, op);
        const oneMinusP = 1 - p;
        if (oneMinusP <= 1e-4) continue;
        const idx = ((cand.y + row) * image.width + (cand.x + col)) * 4;
        const er = hasColor && colorMap ? colorMap[3 * mi] : 255;
        const eg = hasColor && colorMap ? colorMap[3 * mi + 1] : 255;
        const eb = hasColor && colorMap ? colorMap[3 * mi + 2] : 255;
        const luma =
          0.2126 * ((image.data[idx] - p * er) / oneMinusP) +
          0.7152 * ((image.data[idx + 1] - p * eg) / oneMinusP) +
          0.0722 * ((image.data[idx + 2] - p * eb) / oneMinusP);
        const w = Math.min(1, 8 * a);
        errSum += Math.abs(luma - surroundingLuma) * w;
        weightSum += w;
      }
    }
    const err = weightSum > 0 ? errSum / weightSum : Infinity;
    if (err < bestError) {
      bestError = err;
      bestOpacity = op;
    }
  }
  return bestOpacity;
}

/**
 * Peel-style edge cleanup: blend active (watermark) pixels only toward
 * neighbors that are already outside the active set. Does NOT average the
 * whole region (that causes muddy blur).
 */
function edgePeelCleanup(
  out: Uint8ClampedArray,
  imageWidth: number,
  cand: CleanCandidate,
  cleanupMask: Uint8Array
): void {
  const edge = cand.edgeCleanup!;
  const strength = edge.strength;
  const radius = edge.radius;
  const mw = cand.alphaMap.side;
  const mh = cand.alphaMap.side;

  const dilated = new Uint8Array(mw * mh);
  for (let r = 0; r < mh; r++) {
    for (let c = 0; c < mw; c++) {
      if (!cleanupMask[r * mw + c]) continue;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc >= 0 && nc < mw && nr >= 0 && nr < mh) {
            dilated[nr * mw + nc] = 1;
          }
        }
      }
    }
  }

  const active = new Uint8Array(dilated);
  const passes = Math.min(120, Math.max(8, mw + mh));

  for (let iter = 0; iter < passes; iter++) {
    let changed = 0;
    const next = new Uint8Array(active);
    for (let r = 0; r < mh; r++) {
      for (let c = 0; c < mw; c++) {
        if (!active[r * mw + c]) continue;
        let cnt = 0;
        const sum = [0, 0, 0];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nc = c + dc;
            const nr = r + dr;
            if (
              nc < 0 ||
              nc >= mw ||
              nr < 0 ||
              nr >= mh ||
              active[nr * mw + nc]
            ) {
              continue;
            }
            const ni = ((cand.y + nr) * imageWidth + (cand.x + nc)) * 4;
            sum[0] += out[ni];
            sum[1] += out[ni + 1];
            sum[2] += out[ni + 2];
            cnt++;
          }
        }
        if (cnt === 0) continue;
        const idx = ((cand.y + r) * imageWidth + (cand.x + c)) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const avg = sum[ch] / cnt;
          out[idx + ch] = Math.round(
            out[idx + ch] * (1 - strength) + avg * strength
          );
        }
        next[r * mw + c] = 0;
        changed++;
      }
    }
    active.set(next);
    if (changed === 0) break;
  }
}

/**
 * Reverse-alpha reconstruction for one frame.
 * original = (blended - p * overlay) / (1 - p)
 */
export function inpaintFrame(
  image: ImageData,
  cand: CleanCandidate
): ImageData {
  const out = new Uint8ClampedArray(image.data);
  const opacity =
    cand.opacity !== undefined ? cand.opacity : estimateOpacity(image, cand);
  const ceiling = cand.ceiling != null ? cand.ceiling : 1;
  const hasColor = cand.alphaMap.colorValues !== undefined;
  const colorMap = cand.alphaMap.colorValues;
  const overlayValue = cand.overlayValue != null ? cand.overlayValue : 255;
  const mw = cand.alphaMap.side;
  const mh = cand.alphaMap.side;
  const base = cand.baseStrength || 1;
  const cleanupMask = cand.edgeCleanup ? new Uint8Array(mw * mh) : null;

  for (let row = 0; row < mh; row++) {
    for (let col = 0; col < mw; col++) {
      const mi = row * mw + col;
      const p = Math.min(cand.alphaMap.values[mi] * base * opacity, ceiling);
      if (p < 0.002) continue;
      const px = cand.x + col;
      const py = cand.y + row;
      if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
      const idx = (py * image.width + px) * 4;
      const oneMinusP = 1 - p;
      if (oneMinusP <= 1e-4) continue;
      if (cleanupMask) cleanupMask[mi] = 1;
      for (let ch = 0; ch < 3; ch++) {
        const expected =
          hasColor && colorMap ? colorMap[3 * mi + ch] : overlayValue;
        out[idx + ch] = Math.round(
          clamp((image.data[idx + ch] - p * expected) / oneMinusP, 0, 255)
        );
      }
    }
  }

  if (cand.edgeCleanup && cleanupMask) {
    edgePeelCleanup(out, image.width, cand, cleanupMask);
  }

  return new ImageData(out, image.width, image.height);
}

/** Apply post-calibration settings after opacity estimation. */
export function finalizeCandidate(cand: CleanCandidate, opacity: number): void {
  cand.opacity = opacity;

  // 1080p color maps: pure reverse-alpha using embedded RGB
  if (cand.alphaMap.colorValues !== undefined) {
    cand.overlayValue = undefined;
    cand.ceiling = 1;
    cand.edgeCleanup = null;
    return;
  }

  // Grayscale sparkle is pure white → reverse against 255
  cand.overlayValue = 255;
  if (opacity >= 1) {
    cand.ceiling = 0.99;
    cand.edgeCleanup = { strength: 0.6, radius: 2 };
  } else {
    // Weaker blend (typically 0.62): reverse only, no peel
    cand.ceiling = 1;
    cand.edgeCleanup = null;
  }
}

export function buildOffsetCandidates(
  width: number,
  height: number,
  alphaMap: AlphaMap,
  offsets: readonly number[]
): CleanCandidate[] {
  const side = alphaMap.side;
  return offsets.map((off) => ({
    x: clamp(width - off, 0, width - side),
    y: clamp(height - off, 0, height - side),
    alphaMap,
    score: 0,
    baseStrength: 1,
  }));
}
