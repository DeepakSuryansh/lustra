import type { AlphaMap } from "./types";

export const OVERLAY_WHITE = 255;
export const ALPHA_FLOOR = 0.002;
export const ALPHA_CEILING = 0.99;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Normalized cross-correlation between alpha template and local luminance. */
export function nccAt(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  alpha: Float32Array,
  side: number,
  x: number,
  y: number
): number {
  if (x < 0 || y < 0 || x + side > imgW || y + side > imgH) return -1;

  let sP = 0,
    sA = 0,
    sA2 = 0,
    sG = 0,
    sG2 = 0,
    n = 0;

  for (let row = 0; row < side; row++) {
    const imgRow = (y + row) * imgW;
    const aRow = row * side;
    for (let col = 0; col < side; col++) {
      const i = (imgRow + (x + col)) * 4;
      const gray =
        (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const a = alpha[aRow + col];
      sP += a * gray;
      sA += a;
      sA2 += a * a;
      sG += gray;
      sG2 += gray * gray;
      n++;
    }
  }

  if (!n) return -1;
  const mA = sA / n;
  const mG = sG / n;
  const num = sP / n - mA * mG;
  const dA = Math.sqrt(Math.max(0, sA2 / n - mA * mA));
  const dG = Math.sqrt(Math.max(0, sG2 / n - mG * mG));
  if (dA < 1e-3 || dG < 1e-3) return -1;
  return num / (dA * dG);
}

export function scanBottomRightNCC(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  alpha: Float32Array,
  side: number,
  stride = 8,
  refine = 8
): { x: number; y: number; ncc: number } {
  const xStart = Math.max(0, Math.floor(imgW * 0.5));
  const yStart = Math.max(0, Math.floor(imgH * 0.5));
  const xEnd = imgW - side;
  const yEnd = imgH - side;
  if (xEnd < xStart || yEnd < yStart) return { x: -1, y: -1, ncc: -1 };

  let best = { x: xStart, y: yStart, ncc: -1 };
  for (let y = yStart; y <= yEnd; y += stride) {
    for (let x = xStart; x <= xEnd; x += stride) {
      const v = nccAt(data, imgW, imgH, alpha, side, x, y);
      if (v > best.ncc) best = { x, y, ncc: v };
    }
  }

  if (refine > 0 && best.ncc > -1) {
    let r = best;
    const rxLo = Math.max(0, best.x - refine);
    const ryLo = Math.max(0, best.y - refine);
    const rxHi = Math.min(xEnd, best.x + refine);
    const ryHi = Math.min(yEnd, best.y + refine);
    for (let y = ryLo; y <= ryHi; y++) {
      for (let x = rxLo; x <= rxHi; x++) {
        const v = nccAt(data, imgW, imgH, alpha, side, x, y);
        if (v > r.ncc) r = { x, y, ncc: v };
      }
    }
    best = r;
  }
  return best;
}

export interface ReverseBlendOpts {
  gain?: number;
  ceiling?: number;
  floor?: number;
  overlay?: number | [number, number, number];
  colorMap?: Float32Array;
}

/**
 * Reverse alpha compositing over the watermark region only.
 * original = (blended - alpha * overlay) / (1 - alpha)
 */
export function reverseBlendInPlace(
  imageData: ImageData,
  region: { x: number; y: number; w: number; h: number },
  alphaMap: AlphaMap,
  opts: ReverseBlendOpts = {}
): void {
  const gain = opts.gain ?? 1;
  const ceiling = opts.ceiling ?? ALPHA_CEILING;
  const floor = opts.floor ?? ALPHA_FLOOR;
  const overlay = opts.overlay ?? OVERLAY_WHITE;
  const ov = Array.isArray(overlay) ? overlay : [overlay, overlay, overlay];
  const colorMap = opts.colorMap ?? alphaMap.colorValues;

  const { data, width, height } = imageData;
  const sx = Math.max(0, region.x);
  const sy = Math.max(0, region.y);
  const ex = Math.min(width, region.x + region.w);
  const ey = Math.min(height, region.y + region.h);
  if (sx >= ex || sy >= ey) return;

  for (let row = sy; row < ey; row++) {
    const mapRow = (row - region.y) * region.w;
    for (let col = sx; col < ex; col++) {
      const mi = mapRow + (col - region.x);
      const a = alphaMap.values[mi] ?? 0;
      if (a < floor) continue;
      const cl = Math.min(a * gain, ceiling);
      const d = 1 - cl;
      if (d <= 1e-4) continue;
      const idx = (row * width + col) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const expected =
          colorMap != null ? colorMap[mi * 3 + ch] : ov[ch];
        const v = (data[idx + ch] - cl * expected) / d;
        data[idx + ch] = clamp(Math.round(v), 0, 255);
      }
    }
  }
}

/**
 * Optional edge cleanup via local diffusion — only on high-alpha pixels.
 * Helps video frames where compression noise makes pure reverse-alpha imperfect.
 */
export function edgeDiffuseInPlace(
  imageData: ImageData,
  region: { x: number; y: number; w: number; h: number },
  alphaMap: AlphaMap,
  threshold = 0.12,
  dilate = 1,
  iterations = 40
): void {
  const { data, width, height } = imageData;
  const rx = Math.max(0, region.x);
  const ry = Math.max(0, region.y);
  const ex = Math.min(width, region.x + region.w);
  const ey = Math.min(height, region.y + region.h);
  const rw = ex - rx;
  const rh = ey - ry;
  if (rw <= 0 || rh <= 0) return;

  let mask = new Uint8Array(rw * rh);
  for (let r = 0; r < rh; r++) {
    for (let c = 0; c < rw; c++) {
      const mapIdx =
        (r + (ry - region.y)) * region.w + (c + (rx - region.x));
      if ((alphaMap.values[mapIdx] || 0) > threshold) mask[r * rw + c] = 1;
    }
  }

  for (let d = 0; d < dilate; d++) {
    const copy = mask.slice();
    for (let r = 0; r < rh; r++) {
      for (let c = 0; c < rw; c++) {
        if (copy[r * rw + c]) continue;
        if (
          (r > 0 && copy[(r - 1) * rw + c]) ||
          (r < rh - 1 && copy[(r + 1) * rw + c]) ||
          (c > 0 && copy[r * rw + c - 1]) ||
          (c < rw - 1 && copy[r * rw + c + 1])
        ) {
          mask[r * rw + c] = 1;
        }
      }
    }
  }

  for (let it = 0; it < iterations; it++) {
    for (let r = 0; r < rh; r++) {
      for (let c = 0; c < rw; c++) {
        if (!mask[r * rw + c]) continue;
        const gx = rx + c;
        const gy = ry + r;
        const idx = (gy * width + gx) * 4;
        for (let ch = 0; ch < 3; ch++) {
          let sum = 0;
          let n = 0;
          if (gx > 0) {
            sum += data[idx - 4 + ch];
            n++;
          }
          if (gx < width - 1) {
            sum += data[idx + 4 + ch];
            n++;
          }
          if (gy > 0) {
            sum += data[idx - width * 4 + ch];
            n++;
          }
          if (gy < height - 1) {
            sum += data[idx + width * 4 + ch];
            n++;
          }
          if (n) data[idx + ch] = Math.round(sum / n);
        }
      }
    }
  }
}
