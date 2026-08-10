import { createFile, DataStream, Endianness } from "mp4box";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { loadAlphaMap } from "../core/alphaMaps";
import { clamp } from "../core/math";
import type { ProcessResult, ProgressCallback, VideoMeta } from "../core/types";
import {
  OFFSETS_1080,
  OFFSETS_720,
  buildOffsetCandidates,
  estimateOpacity,
  finalizeCandidate,
  inpaintFrame,
  scorePosition,
  type CleanCandidate,
} from "./videoCleaner";

const AAC_SAMPLE_RATES = [
  96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
  8000, 7350,
];

export function isVideoFile(file: File): boolean {
  if (file.type === "video/mp4" || file.type === "video/quicktime") return true;
  return /\.mp4$/i.test(file.name);
}

interface DemuxSample {
  data: Uint8Array;
  cts: number;
  dts: number;
  duration: number;
  timescale: number;
  is_sync: boolean;
}

interface DemuxResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videoTrack: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audioTrack: any | null;
  videoSamples: DemuxSample[];
  audioSamples: DemuxSample[];
  videoDescription: Uint8Array | null;
}

function extractVideoDescription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  file: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  track: any
): Uint8Array | null {
  try {
    const trak = file.getTrackById(track.id);
    const entries = trak?.mdia?.minf?.stbl?.stsd?.entries || [];
    for (const e of entries) {
      const cfg = e.avcC || e.hvcC || e.vpcC || e.av1C;
      if (!cfg) continue;
      const ds = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
      cfg.write(ds);
      return new Uint8Array(ds.buffer, 8);
    }
  } catch {
    /* optional */
  }
  return null;
}

function demuxMp4(arrayBuffer: ArrayBuffer): Promise<DemuxResult> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file: any = createFile(true);
    const videoSamples: DemuxSample[] = [];
    const audioSamples: DemuxSample[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let videoTrack: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let audioTrack: any = null;
    let settled = false;

    const settleOk = () => {
      if (settled) return;
      if (!videoTrack) {
        settled = true;
        reject(new Error("No video track found in file"));
        return;
      }
      if (videoSamples.length === 0) {
        settled = true;
        reject(new Error("Could not read video frames from this file"));
        return;
      }
      settled = true;
      resolve({
        videoTrack,
        audioTrack,
        videoSamples,
        audioSamples,
        videoDescription: extractVideoDescription(file, videoTrack),
      });
    };

    file.onError = (e: string) => {
      if (!settled) {
        settled = true;
        reject(new Error("Could not read this video: " + e));
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file.onReady = (info: any) => {
      videoTrack = info.videoTracks?.[0] ?? null;
      audioTrack = info.audioTracks?.[0] ?? null;
      if (!videoTrack) {
        settled = true;
        reject(new Error("No video track found in file"));
        return;
      }
      file.setExtractionOptions(videoTrack.id, "video", { nbSamples: 1_000_000 });
      if (audioTrack) {
        file.setExtractionOptions(audioTrack.id, "audio", {
          nbSamples: 1_000_000,
        });
      }
      file.start();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file.onSamples = (_id: number, user: string, samples: any[]) => {
      const bucket = user === "video" ? videoSamples : audioSamples;
      for (const s of samples) {
        bucket.push({
          data: s.data.slice(0),
          cts: s.cts,
          dts: s.dts,
          duration: s.duration,
          timescale: s.timescale,
          is_sync: s.is_sync,
        });
      }
    };

    try {
      const buf = arrayBuffer.slice(0) as ArrayBuffer & { fileStart?: number };
      buf.fileStart = 0;
      file.appendBuffer(buf);
      file.flush();
    } catch (e) {
      if (!settled) {
        settled = true;
        reject(e instanceof Error ? e : new Error(String(e)));
      }
      return;
    }

    queueMicrotask(() => {
      if (!settled) settleOk();
    });
  });
}

export function estimateEncodeBitrate(
  width: number,
  height: number,
  fps: number,
  sourceBitrate: number
): number {
  const pixels = width * height;
  const qualityFloor = Math.round(pixels * fps * 0.12);
  const sourceTarget =
    sourceBitrate > 0 ? Math.round(sourceBitrate * 1.12) : qualityFloor;
  const target = Math.max(qualityFloor, sourceTarget);
  const cap =
    pixels >= 3840 * 2160
      ? 50_000_000
      : pixels >= 1920 * 1080
        ? 25_000_000
        : pixels >= 1280 * 720
          ? 14_000_000
          : 8_000_000;
  return clamp(target, 2_000_000, cap);
}

async function prepareCandidates(
  width: number,
  height: number
): Promise<{ candidates: CleanCandidate[]; variant: string } | null> {
  const is1080 =
    (width === 1920 && height === 1080) ||
    (width === 1080 && height === 1920);
  const is720 =
    (width === 1280 && height === 720) ||
    (width === 720 && height === 1280);

  if (is1080) {
    const alphaMap = await loadAlphaMap("video1080", 84, "rgba");
    return {
      candidates: buildOffsetCandidates(width, height, alphaMap, OFFSETS_1080),
      variant: "omni-1080",
    };
  }

  if (is720) {
    const alphaMap = await loadAlphaMap("small", 48, "luma");
    return {
      candidates: buildOffsetCandidates(width, height, alphaMap, OFFSETS_720),
      variant: "omni-720",
    };
  }

  // Other resolutions: try 48px mark at several bottom-right offsets
  const alphaMap = await loadAlphaMap("small", 48, "luma");
  const side = alphaMap.side;
  const offsets = [
    side + 32,
    side + 48,
    side + 64,
    side + 24,
    side + 72,
    side + 96,
  ];
  return {
    candidates: buildOffsetCandidates(width, height, alphaMap, offsets),
    variant: "omni-generic",
  };
}

export async function processVideoFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ProcessResult> {
  const report = (stage: string, ratio: number, message?: string) =>
    onProgress?.({ stage, ratio, message });

  if (
    typeof VideoDecoder === "undefined" ||
    typeof VideoEncoder === "undefined"
  ) {
    throw new Error(
      "Your browser may not support this video format. WebCodecs is required (Chrome or Edge recommended)."
    );
  }

  report("demux", 0.02, "Reading container…");
  const arrayBuffer = await file.arrayBuffer();
  const demuxed = await demuxMp4(arrayBuffer);
  const {
    videoTrack,
    audioTrack,
    videoSamples,
    audioSamples,
    videoDescription,
  } = demuxed;

  const width: number = videoTrack.video.width;
  const height: number = videoTrack.video.height;
  const totalFrames = videoSamples.length || 1;
  const timescale =
    (videoSamples[0] && videoSamples[0].timescale) ||
    videoTrack.timescale ||
    30_000;

  let avgDur = 0;
  for (const s of videoSamples) avgDur += s.duration;
  avgDur = avgDur / totalFrames || timescale / 30;
  const fps = Math.max(1, Math.round(timescale / avgDur));
  const durationSec = totalFrames / fps;
  const estimatedBitrate =
    durationSec > 0 ? Math.round((file.size * 8) / durationSec) : 0;

  const meta: VideoMeta = {
    kind: "video",
    width,
    height,
    fps,
    durationSec,
    videoCodec: videoTrack.codec || "unknown",
    audioCodec: audioTrack?.codec ?? null,
    hasAudio: Boolean(audioTrack && audioSamples.length),
    sampleRate: audioTrack?.audio?.sample_rate ?? null,
    channels: audioTrack?.audio?.channel_count ?? null,
    fileSize: file.size,
    estimatedBitrate,
    frameCount: totalFrames,
  };

  report("setup", 0.06, "Loading watermark calibration…");
  const prep = await prepareCandidates(width, height);
  if (!prep) {
    return {
      blob: file,
      filename: file.name,
      removed: false,
      message: "No supported watermark profile for this resolution.",
      meta,
    };
  }
  const { candidates, variant } = prep;

  const encodeBitrate = estimateEncodeBitrate(
    width,
    height,
    fps,
    estimatedBitrate
  );

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
    video: { codec: "avc", width, height },
    audio: audioTrack
      ? {
          codec: "aac",
          sampleRate: audioTrack.audio.sample_rate,
          numberOfChannels: audioTrack.audio.channel_count,
        }
      : undefined,
  });

  let encoderConfig: VideoEncoderConfig = {
    codec: "avc1.640028",
    width,
    height,
    bitrate: encodeBitrate,
    framerate: fps,
    avc: { format: "avc" },
    latencyMode: "quality",
  };

  let support = await VideoEncoder.isConfigSupported(encoderConfig);
  if (!support.supported) {
    encoderConfig = { ...encoderConfig, codec: "avc1.42001f" };
    support = await VideoEncoder.isConfigSupported(encoderConfig);
    if (!support.supported) {
      throw new Error("No supported H.264 encoder configuration");
    }
  }

  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, metaOut) => muxer.addVideoChunk(chunk, metaOut),
    error: (e) => {
      encodeError = e;
    },
  });
  encoder.configure(encoderConfig);

  const patchCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patchCtx = (patchCanvas as any).getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!patchCtx) throw new Error("Canvas 2D unavailable");

  let decodeError: Error | null = null;
  let chosen: CleanCandidate | null = null;
  let calibratedOpacity: number | null = null;
  let noWatermark = false;
  let processed = 0;
  let scored = 0;
  const pending: Array<{
    imageData: ImageData;
    timestamp: number;
    duration?: number;
  }> = [];
  const calibrationCount = Math.min(5, totalFrames);
  const keyInterval = Math.max(1, fps * 2);
  const SCORE_MIN = 0.12; // below this: treat as no watermark

  const encodeCleaned = (
    imageData: ImageData,
    timestamp: number,
    duration?: number
  ) => {
    const cand = chosen || candidates[0];
    const cleaned = inpaintFrame(imageData, cand);

    const init: VideoFrameBufferInit = {
      format: "RGBA",
      codedWidth: width,
      codedHeight: height,
      timestamp,
    };
    if (duration != null) init.duration = duration;

    // Copy pixels so the VideoFrame owns a stable buffer
    const pixels = new Uint8ClampedArray(cleaned.data);
    const vf = new VideoFrame(pixels.buffer as ArrayBuffer, init);
    encoder.encode(vf, { keyFrame: processed % keyInterval === 0 });
    vf.close();
    processed += 1;
    if (processed % 4 === 0) {
      report(
        "processing",
        0.1 + 0.82 * (processed / totalFrames),
        `Frame ${processed} / ${totalFrames}`
      );
    }
  };

  report("processing", 0.1, "Calibrating watermark position…");

  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const finish = (err?: Error) => {
      if (finished) return;
      finished = true;
      if (err) reject(err);
      else resolve();
    };

    const decoder = new VideoDecoder({
      output: (frame) => {
        try {
          const ts = frame.timestamp;
          const dur = frame.duration ?? undefined;
          patchCtx.drawImage(frame, 0, 0, width, height);
          frame.close();
          const imageData = patchCtx.getImageData(0, 0, width, height);

          if (!chosen) {
            // Accumulate position scores over calibration frames
            for (const c of candidates) {
              c.score += scorePosition(imageData, c);
            }
            pending.push({ imageData, timestamp: ts, duration: dur });
            scored += 1;

            if (scored >= calibrationCount) {
              // Prefer first offset unless another clearly wins (avoids bright
              // background patches stealing the mark position)
              const best = candidates.reduce((a, b) =>
                b.score > a.score ? b : a
              );
              const tieMargin = 0.04 * Math.max(1, scored);
              chosen =
                best.score >= candidates[0].score + tieMargin
                  ? best
                  : candidates[0];

              // Opacity histogram over calibration frames
              const histogram: Record<string, number> = {};
              for (const fr of pending) {
                const op = estimateOpacity(fr.imageData, chosen);
                const key = String(op);
                histogram[key] = (histogram[key] || 0) + 1;
              }
              let modal = 1;
              let modalCount = 0;
              for (const k of Object.keys(histogram)) {
                if (histogram[k] > modalCount) {
                  modalCount = histogram[k];
                  modal = parseFloat(k);
                }
              }

              // Low correlation → no watermark
              const avgScore = chosen.score / scored;
              if (avgScore < SCORE_MIN) {
                noWatermark = true;
              } else {
                finalizeCandidate(chosen, modal);
                calibratedOpacity = modal;
              }

              for (const fr of pending) {
                if (noWatermark) {
                  const init: VideoFrameBufferInit = {
                    format: "RGBA",
                    codedWidth: width,
                    codedHeight: height,
                    timestamp: fr.timestamp,
                  };
                  if (fr.duration != null) init.duration = fr.duration;
                  const vf = new VideoFrame(
                    fr.imageData.data.buffer as ArrayBuffer,
                    init
                  );
                  encoder.encode(vf, {
                    keyFrame: processed % keyInterval === 0,
                  });
                  vf.close();
                  processed += 1;
                } else {
                  encodeCleaned(fr.imageData, fr.timestamp, fr.duration);
                }
              }
              pending.length = 0;
            }
            return;
          }

          if (noWatermark) {
            const init: VideoFrameBufferInit = {
              format: "RGBA",
              codedWidth: width,
              codedHeight: height,
              timestamp: ts,
            };
            if (dur != null) init.duration = dur;
            const vf = new VideoFrame(imageData.data.buffer as ArrayBuffer, init);
            encoder.encode(vf, { keyFrame: processed % keyInterval === 0 });
            vf.close();
            processed += 1;
          } else {
            encodeCleaned(imageData, ts, dur);
          }
        } catch (e) {
          decodeError = e instanceof Error ? e : new Error(String(e));
          try {
            frame.close();
          } catch {
            /* */
          }
        }
      },
      error: (e) => {
        decodeError = e;
      },
    });

    decoder.configure({
      codec: videoTrack.codec,
      codedWidth: width,
      codedHeight: height,
      description: videoDescription || undefined,
    });

    void (async () => {
      try {
        let framesFed = 0;
        for (const s of videoSamples) {
          if (decodeError) throw decodeError;
          if (encodeError) throw encodeError;
          while (decoder.decodeQueueSize > 8 || encoder.encodeQueueSize > 8) {
            await new Promise((r) => setTimeout(r, 4));
          }
          decoder.decode(
            new EncodedVideoChunk({
              type: s.is_sync ? "key" : "delta",
              timestamp: (s.cts * 1e6) / s.timescale,
              duration: (s.duration * 1e6) / s.timescale,
              data: s.data,
            })
          );
          framesFed++;
          if (framesFed % 24 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        await decoder.flush();
        await encoder.flush();
        if (decodeError) throw decodeError;
        if (encodeError) throw encodeError;
        decoder.close();
        encoder.close();
        finish();
      } catch (e) {
        try {
          decoder.close();
        } catch {
          /* */
        }
        try {
          encoder.close();
        } catch {
          /* */
        }
        finish(e instanceof Error ? e : new Error(String(e)));
      }
    })();
  });

  // If calibration decided no watermark, return original file untouched
  if (noWatermark) {
    report("done", 1, "No supported watermark detected");
    return {
      blob: file,
      filename: file.name,
      removed: false,
      message: "No supported watermark detected — file unchanged.",
      meta,
    };
  }

  // Stream-copy original AAC
  if (audioTrack && audioSamples.length) {
    try {
      const sr = audioTrack.audio.sample_rate as number;
      const ch = audioTrack.audio.channel_count as number;
      let srIdx = AAC_SAMPLE_RATES.indexOf(sr);
      if (srIdx < 0) srIdx = 4;
      const audioMeta = {
        decoderConfig: {
          codec: "mp4a.40.2",
          sampleRate: sr,
          numberOfChannels: ch,
          description: new Uint8Array([
            (16 | (srIdx >> 1)) & 0xff,
            (((srIdx & 1) << 7) | (ch << 3)) & 0xff,
          ]),
        },
      };
      for (const s of audioSamples) {
        muxer.addAudioChunk(
          new EncodedAudioChunk({
            type: "key",
            timestamp: (s.cts * 1e6) / s.timescale,
            duration: (s.duration * 1e6) / s.timescale,
            data: s.data,
          }),
          audioMeta
        );
      }
    } catch {
      console.warn("[Lustra] Audio copy failed — output may be silent");
    }
  }

  report("mux", 0.95, "Finalizing MP4…");
  muxer.finalize();
  const target = muxer.target as ArrayBufferTarget;
  const blob = new Blob([target.buffer], { type: "video/mp4" });

  if (blob.size < 1000) {
    throw new Error("Video processing failed — output is empty");
  }
  if (processed < totalFrames * 0.9) {
    throw new Error(
      `Video processing failed — only ${processed}/${totalFrames} frames encoded`
    );
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "cleaned";
  const opacityNote =
    calibratedOpacity != null ? ` · opacity ${calibratedOpacity}` : "";
  report("done", 1, "Watermark removed");
  return {
    blob,
    filename: `${base}-clean.mp4`,
    removed: true,
    message: `Removed ${variant}${opacityNote} · ${width}×${height} · ${fps}fps · ~${Math.round(encodeBitrate / 1e6)} Mbps`,
    meta,
  };
}
