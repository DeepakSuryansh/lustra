# Lustra

**Gemini & Omni watermark remover** — a local, browser-only web app that removes the visible Gemini sparkle / Omni / Flow corner watermark from images and videos without uploading media to a server.

## Features

- **Images** — PNG, JPEG, WebP, BMP  
  Reverse-alpha reconstruction of the known Gemini sparkle watermark (bottom-right ROI + NCC detection).
- **Video** — MP4 (H.264 + AAC)  
  WebCodecs decode → per-frame ROI cleanup → high-quality re-encode; original AAC is stream-copied when possible.
- **Bulk queue** — multi-file drag & drop, per-file progress, download all as ZIP.
- **Privacy** — 100% client-side processing.
- **Quality** — never downscales; source-aware bitrate; preserves resolution, FPS, and audio.

## Run locally

```bash
cd lustra
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

**Browser:** Chrome or Edge recommended (WebCodecs required for video).

## Build

```bash
npm run build
npm run preview
```

## Architecture

```
src/
  engine/
    core/          # types, alpha maps, reverse-blend math
    detectors/     # Gemini image watermark detector
    image/         # image pipeline
    video/         # MP4 demux / WebCodecs / mux
    queue/         # batch processing queue
  ui/              # app shell, drop zone, job list
  styles/
```

Watermark removal uses deterministic reverse alpha compositing against calibrated sparkle alpha maps — not AI inpainting.

## Notes

- Files without a supported watermark are left **unchanged** (no re-encode).
- Invisible SynthID-style watermarks are out of scope.
- Manual region selection / generic removal are future extensions.
