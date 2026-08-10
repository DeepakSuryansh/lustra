export type FileKind = "image" | "video";

export type JobStatus =
  | "queued"
  | "analyzing"
  | "processing"
  | "completed"
  | "failed"
  | "unchanged";

export interface DetectionResult {
  detected: boolean;
  variant: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  side: number;
  gain: number;
  method: string;
  alphaMap?: AlphaMap;
  overlay?: [number, number, number] | number;
  ceiling?: number;
  edgeCleanup?: boolean;
}

export interface AlphaMap {
  values: Float32Array;
  side: number;
  colorValues?: Float32Array;
}

export interface ImageMeta {
  kind: "image";
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  hasAlpha: boolean;
}

export interface VideoMeta {
  kind: "video";
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  videoCodec: string;
  audioCodec: string | null;
  hasAudio: boolean;
  sampleRate: number | null;
  channels: number | null;
  fileSize: number;
  estimatedBitrate: number;
  frameCount: number;
}

export type MediaMeta = ImageMeta | VideoMeta;

export interface ProcessProgress {
  stage: string;
  ratio: number;
  message?: string;
}

export interface ProcessResult {
  blob: Blob;
  filename: string;
  removed: boolean;
  message: string;
  meta?: MediaMeta;
}

export interface QueueJob {
  id: string;
  file: File;
  kind: FileKind;
  status: JobStatus;
  progress: number;
  stage: string;
  message: string;
  resultBlob: Blob | null;
  resultName: string | null;
  previewUrl: string | null;
  error: string | null;
  createdAt: number;
}

export type ProgressCallback = (p: ProcessProgress) => void;
