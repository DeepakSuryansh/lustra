import { isImageFile, processImageFile } from "../image/imageProcessor";
import { isVideoFile, processVideoFile } from "../video/videoPipeline";
import type { FileKind, QueueJob } from "../core/types";

export type QueueListener = (jobs: QueueJob[]) => void;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function detectKind(file: File): FileKind | null {
  if (isImageFile(file)) return "image";
  if (isVideoFile(file)) return "video";
  return null;
}

export class ProcessingQueue {
  private jobs: QueueJob[] = [];
  private listeners: QueueListener[] = [];
  private running = false;
  private imageConcurrency = 3;
  private activeImages = 0;
  private activeVideo = false;

  subscribe(fn: QueueListener): () => void {
    this.listeners.push(fn);
    fn(this.jobs);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit() {
    const snapshot = [...this.jobs];
    for (const l of this.listeners) l(snapshot);
  }

  getJobs(): QueueJob[] {
    return [...this.jobs];
  }

  completedCount(): number {
    return this.jobs.filter(
      (j) => j.status === "completed" || j.status === "unchanged"
    ).length;
  }

  addFiles(fileList: FileList | File[]): { added: number; skipped: string[] } {
    const skipped: string[] = [];
    let added = 0;
    const files = Array.from(fileList);

    for (const file of files) {
      const kind = detectKind(file);
      if (!kind) {
        skipped.push(file.name);
        continue;
      }
      const job: QueueJob = {
        id: uid(),
        file,
        kind,
        status: "queued",
        progress: 0,
        stage: "Queued",
        message: "",
        resultBlob: null,
        resultName: null,
        previewUrl: kind === "image" ? URL.createObjectURL(file) : null,
        error: null,
        createdAt: Date.now(),
      };
      this.jobs.push(job);
      added++;
    }
    this.emit();
    void this.pump();
    return { added, skipped };
  }

  removeJob(id: string) {
    const job = this.jobs.find((j) => j.id === id);
    if (job?.previewUrl) URL.revokeObjectURL(job.previewUrl);
    this.jobs = this.jobs.filter((j) => j.id !== id);
    this.emit();
  }

  clearFinished() {
    for (const j of this.jobs) {
      if (
        (j.status === "completed" ||
          j.status === "unchanged" ||
          j.status === "failed") &&
        j.previewUrl
      ) {
        URL.revokeObjectURL(j.previewUrl);
      }
    }
    this.jobs = this.jobs.filter(
      (j) =>
        j.status === "queued" ||
        j.status === "analyzing" ||
        j.status === "processing"
    );
    this.emit();
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (true) {
        // Prefer video serially (heavy); images can parallelize lightly
        const nextVideo = this.jobs.find(
          (j) => j.status === "queued" && j.kind === "video"
        );
        const nextImages = this.jobs.filter(
          (j) => j.status === "queued" && j.kind === "image"
        );

        const tasks: Promise<void>[] = [];

        if (nextVideo && !this.activeVideo) {
          this.activeVideo = true;
          tasks.push(
            this.runJob(nextVideo).finally(() => {
              this.activeVideo = false;
            })
          );
        }

        for (const img of nextImages) {
          if (this.activeImages >= this.imageConcurrency) break;
          // skip if already picked this loop
          if (img.status !== "queued") continue;
          img.status = "analyzing";
          this.activeImages++;
          tasks.push(
            this.runJob(img).finally(() => {
              this.activeImages--;
            })
          );
        }

        if (tasks.length === 0) break;
        this.emit();
        await Promise.race(tasks);
        // allow others to finish without blocking forever
        await Promise.allSettled(tasks);
        this.emit();
      }
    } finally {
      this.running = false;
      // If more queued while we finished, restart
      if (this.jobs.some((j) => j.status === "queued")) {
        void this.pump();
      }
    }
  }

  private async runJob(job: QueueJob) {
    // Re-check (race with concurrent pump)
    if (job.status !== "queued" && job.status !== "analyzing") return;
    job.status = "processing";
    job.stage = "Processing";
    job.progress = 0.02;
    this.emit();

    try {
      const onProgress = (p: {
        stage: string;
        ratio: number;
        message?: string;
      }) => {
        job.progress = Math.max(0, Math.min(1, p.ratio));
        job.stage = p.message || p.stage;
        this.emit();
      };

      const result =
        job.kind === "image"
          ? await processImageFile(job.file, onProgress)
          : await processVideoFile(job.file, onProgress);

      job.resultBlob = result.blob;
      job.resultName = result.filename;
      job.message = result.message;
      job.progress = 1;
      job.status = result.removed ? "completed" : "unchanged";
      job.stage = result.removed ? "Clean" : "Unchanged";
    } catch (e) {
      job.status = "failed";
      job.stage = "Failed";
      job.error =
        e instanceof Error ? e.message : "Processing failed";
      job.message = job.error;
      job.progress = 0;
    }
    this.emit();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadAllZip(jobs: QueueJob[]) {
  const ready = jobs.filter(
    (j) =>
      (j.status === "completed" || j.status === "unchanged") && j.resultBlob
  );
  if (ready.length === 0) return;

  if (ready.length === 1) {
    downloadBlob(ready[0].resultBlob!, ready[0].resultName || ready[0].file.name);
    return;
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const used = new Set<string>();
  for (const j of ready) {
    let name = j.resultName || j.file.name;
    if (used.has(name)) {
      const parts = name.split(".");
      const ext = parts.length > 1 ? parts.pop()! : "";
      const base = parts.join(".") || "file";
      let i = 2;
      while (used.has(`${base}-${i}.${ext}`)) i++;
      name = ext ? `${base}-${i}.${ext}` : `${base}-${i}`;
    }
    used.add(name);
    zip.file(name, j.resultBlob!);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `lustra-clean-${Date.now()}.zip`);
}
