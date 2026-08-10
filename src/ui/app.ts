import {
  ProcessingQueue,
  downloadBlob,
  downloadAllZip,
  type QueueJob,
} from "../engine";
import {
  COPYRIGHT_YEAR,
  SITE_NAME,
  getLegalPage,
  type LegalPageId,
} from "../legal/pages";
import { ADSENSE } from "../ads/config";
import { adUnitHtml, ensureAdSenseScript, pushAds } from "../ads/adsense";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function iconUpload(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5"/></svg>`;
}

function iconBrand(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.5H19l-4.4 3.3 1.7 5.4L12 14.2 7.7 17.2l1.7-5.4L5 8.5h5.2L12 3z"/></svg>`;
}

function iconVideo(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/></svg>`;
}

function iconDownload(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>`;
}

function iconTrash(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="m6 7 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/></svg>`;
}

function statusClass(status: QueueJob["status"]): string {
  return status;
}

function stageClass(job: QueueJob): string {
  if (job.status === "failed") return "is-error";
  if (job.status === "completed") return "is-ok";
  if (job.status === "unchanged") return "is-warn";
  return "";
}

function checkWebCodecs(): boolean {
  return (
    typeof VideoDecoder !== "undefined" &&
    typeof VideoEncoder !== "undefined" &&
    typeof EncodedVideoChunk !== "undefined"
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function currentHashPage(): LegalPageId | "home" {
  const raw = (location.hash || "#").replace(/^#\/?/, "").toLowerCase();
  if (
    raw === "privacy" ||
    raw === "terms" ||
    raw === "disclaimer" ||
    raw === "contact" ||
    raw === "about"
  ) {
    return raw;
  }
  return "home";
}

function footerHtml(): string {
  return `
    <footer class="site-footer">
      <nav class="footer-nav" aria-label="Legal">
        <a href="#about">About</a>
        <a href="#privacy">Privacy Policy</a>
        <a href="#terms">Terms of Service</a>
        <a href="#disclaimer">Disclaimer</a>
        <a href="#contact">Contact</a>
      </nav>
      <p class="footer-note">
        <strong>Local-only processing.</strong>
        Optimized for Gemini sparkle and Omni / Flow corner watermarks.
        Source resolution, frame rate, and audio are preserved whenever possible.
      </p>
      <p class="footer-copy">
        © ${COPYRIGHT_YEAR} ${SITE_NAME}. All rights reserved.
        Not affiliated with Google, Gemini, Omni, or Flow.
      </p>
    </footer>
  `;
}

export function mountApp(root: HTMLElement) {
  const queue = new ProcessingQueue();
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;
  let homeWired = false;

  function showNotice(msg: string) {
    const noticeEl = root.querySelector<HTMLElement>("#notice");
    if (!noticeEl) return;
    noticeEl.textContent = msg;
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      noticeEl.textContent = "";
    }, 5000);
  }

  function renderJob(job: QueueJob): string {
    const thumb =
      job.kind === "image" && job.previewUrl
        ? `<img src="${job.previewUrl}" alt="" />`
        : iconVideo();

    const canDownload =
      (job.status === "completed" || job.status === "unchanged") &&
      job.resultBlob;

    const stageText =
      job.status === "failed"
        ? job.error || "Processing failed"
        : job.stage || job.message || job.status;

    return `
      <article class="job" data-id="${job.id}">
        <div class="job-thumb">${thumb}</div>
        <div class="job-body">
          <div class="job-title-row">
            <span class="job-name" title="${escapeAttr(job.file.name)}">${escapeHtml(job.file.name)}</span>
            <span class="job-size">${formatBytes(job.file.size)}</span>
          </div>
          <div class="progress" aria-hidden="true"><span style="width:${Math.round(job.progress * 100)}%"></span></div>
          <div class="job-stage ${stageClass(job)}">${escapeHtml(stageText)}</div>
        </div>
        <div class="job-actions">
          <span class="status-badge ${statusClass(job.status)}">${job.status}</span>
          ${
            canDownload
              ? `<button type="button" class="icon-btn" data-action="download" data-id="${job.id}" title="Download" aria-label="Download ${escapeAttr(job.file.name)}">${iconDownload()}</button>`
              : ""
          }
          <button type="button" class="icon-btn" data-action="remove" data-id="${job.id}" title="Remove" aria-label="Remove ${escapeAttr(job.file.name)}">${iconTrash()}</button>
        </div>
      </article>
    `;
  }

  function wireHomeInteractions() {
    if (homeWired) return;
    const dropzone = root.querySelector<HTMLElement>("#dropzone");
    const fileInput = root.querySelector<HTMLInputElement>("#file-input");
    const browseBtn = root.querySelector<HTMLButtonElement>("#browse-btn");
    const downloadAllBtn = root.querySelector<HTMLButtonElement>("#download-all");
    const clearFinishedBtn =
      root.querySelector<HTMLButtonElement>("#clear-finished");
    const jobList = root.querySelector<HTMLElement>("#job-list");
    if (!dropzone || !fileInput || !browseBtn || !jobList) return;

    homeWired = true;

    const ingest = (files: FileList | File[]) => {
      const { added, skipped } = queue.addFiles(files);
      if (skipped.length) {
        showNotice(
          `Unsupported: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? ` +${skipped.length - 3} more` : ""}. Use PNG, JPG, WEBP, BMP, or MP4.`
        );
      }
      if (added === 0 && skipped.length === 0) {
        showNotice("No files selected.");
      }
    };

    browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.length) ingest(fileInput.files);
      fileInput.value = "";
    });
    dropzone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", (e) => {
      if (e.target === dropzone) dropzone.classList.remove("is-dragover");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      if (e.dataTransfer?.files?.length) ingest(e.dataTransfer.files);
    });

    downloadAllBtn?.addEventListener("click", () => {
      void downloadAllZip(queue.getJobs());
    });
    clearFinishedBtn?.addEventListener("click", () => queue.clearFinished());

    jobList.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!btn) return;
      const id = btn.dataset.id!;
      const action = btn.dataset.action;
      if (action === "remove") {
        queue.removeJob(id);
        return;
      }
      if (action === "download") {
        const job = queue.getJobs().find((j) => j.id === id);
        if (job?.resultBlob) {
          downloadBlob(job.resultBlob, job.resultName || job.file.name);
        }
      }
    });

    queue.subscribe((jobs) => {
      const queueSection = root.querySelector<HTMLElement>("#queue-section");
      const queueMeta = root.querySelector<HTMLElement>("#queue-meta");
      const list = root.querySelector<HTMLElement>("#job-list");
      const dlAll = root.querySelector<HTMLButtonElement>("#download-all");
      const clearBtn = root.querySelector<HTMLButtonElement>("#clear-finished");
      if (!queueSection || !queueMeta || !list) return;

      queueSection.hidden = jobs.length === 0;
      const done = jobs.filter(
        (j) => j.status === "completed" || j.status === "unchanged"
      ).length;
      const failed = jobs.filter((j) => j.status === "failed").length;
      queueMeta.textContent = `${done} / ${jobs.length} completed${failed ? ` · ${failed} failed` : ""}`;

      const ready = jobs.filter(
        (j) =>
          (j.status === "completed" || j.status === "unchanged") && j.resultBlob
      );
      if (dlAll) dlAll.disabled = ready.length === 0;
      if (clearBtn) {
        clearBtn.disabled =
          jobs.filter(
            (j) =>
              j.status === "completed" ||
              j.status === "unchanged" ||
              j.status === "failed"
          ).length === 0;
      }
      list.innerHTML = jobs.map(renderJob).join("");
    });
  }

  function renderHome() {
    document.title = "Lustra — Gemini & Omni Watermark Remover";
    homeWired = false;
    root.innerHTML = `
      <div class="app-shell">
        <section class="hero">
          <h1>Remove <span>Gemini &amp; Omni</span> watermarks</h1>
          <p>
            Drop images or videos — watermarks are reconstructed and stripped
            on-device. No account, no sign up needed. Completely free and
            unlimited use.
          </p>
        </section>

        ${adUnitHtml(ADSENSE.slots.top, "horizontal")}

        <div class="compat" id="compat" hidden>
          Video processing needs WebCodecs (Chrome or Edge recommended).
          Image processing still works.
        </div>

        <div class="notice" id="notice" role="status" aria-live="polite"></div>

        <div class="workspace">
          <aside class="ad-rail ad-rail--left" aria-label="Advertisement">
            ${adUnitHtml(ADSENSE.slots.left, "vertical")}
          </aside>

          <div class="workspace-main">
            <div
              class="dropzone"
              id="dropzone"
              tabindex="0"
              role="button"
              aria-label="Drop files or browse to upload images and videos"
            >
              <input
                class="file-input"
                id="file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/bmp,video/mp4,.png,.jpg,.jpeg,.webp,.bmp,.mp4"
                multiple
              />
              <div class="dropzone-icon">${iconUpload()}</div>
              <h2>Drop files here</h2>
              <p>or browse — processing starts automatically</p>
              <div class="dropzone-actions">
                <button type="button" class="btn btn-primary" id="browse-btn">
                  Browse files
                </button>
              </div>
              <div class="formats">PNG · JPG · WEBP · BMP · MP4</div>
            </div>

            <section class="queue-section" id="queue-section" hidden>
              <div class="queue-header">
                <div>
                  <h3>Processing queue</h3>
                  <div class="queue-meta" id="queue-meta">0 / 0 completed</div>
                </div>
                <div class="queue-actions">
                  <button type="button" class="btn btn-ghost btn-sm" id="download-all" disabled>
                    Download all
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm" id="clear-finished" disabled>
                    Clear finished
                  </button>
                </div>
              </div>
              <div class="job-list" id="job-list"></div>
            </section>
          </div>

          <aside class="ad-rail ad-rail--right" aria-label="Advertisement">
            ${adUnitHtml(ADSENSE.slots.right, "vertical")}
          </aside>
        </div>

        ${adUnitHtml(ADSENSE.slots.mid, "horizontal")}
        ${adUnitHtml(ADSENSE.slots.bottom, "rectangle")}

        ${footerHtml()}
      </div>
    `;

    const compatEl = root.querySelector<HTMLElement>("#compat");
    if (compatEl && !checkWebCodecs()) compatEl.hidden = false;

    ensureAdSenseScript();
    pushAds();
    wireHomeInteractions();
    // Refresh queue UI for existing jobs after re-render
    const jobs = queue.getJobs();
    if (jobs.length) {
      const queueSection = root.querySelector<HTMLElement>("#queue-section");
      const list = root.querySelector<HTMLElement>("#job-list");
      const queueMeta = root.querySelector<HTMLElement>("#queue-meta");
      if (queueSection && list && queueMeta) {
        queueSection.hidden = false;
        const done = jobs.filter(
          (j) => j.status === "completed" || j.status === "unchanged"
        ).length;
        queueMeta.textContent = `${done} / ${jobs.length} completed`;
        list.innerHTML = jobs.map(renderJob).join("");
      }
    }
  }

  function renderLegal(pageId: LegalPageId) {
    const page = getLegalPage(pageId);
    if (!page) {
      location.hash = "home";
      return;
    }
    document.title = `${page.title} — ${SITE_NAME}`;
    homeWired = false;
    root.innerHTML = `
      <div class="app-shell legal-shell">
        <header class="topbar">
          <a class="brand brand-link" href="#home" aria-label="Lustra home">
            <div class="brand-mark" aria-hidden="true">${iconBrand()}</div>
            <div class="brand-text">
              <div class="brand-name">Lustra</div>
              <div class="brand-tag">Gemini &amp; Omni cleaner</div>
            </div>
          </a>
          <a class="btn btn-ghost btn-sm" href="#home">← Back to tool</a>
        </header>

        <article class="legal-page">
          <h1>${page.title}</h1>
          <div class="legal-body">
            ${page.html}
          </div>
        </article>

        ${footerHtml()}
      </div>
    `;
    window.scrollTo(0, 0);
  }

  function route() {
    const page = currentHashPage();
    if (page === "home") renderHome();
    else renderLegal(page);
  }

  window.addEventListener("hashchange", route);
  route();
}
