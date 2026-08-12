/** Distinct SEO landing-page and homepage content (HTML strings). */

import { SEO_ROUTES, type SeoRouteId } from "./site";

export interface FaqItem {
  question: string;
  answer: string;
}

export const HOME_FAQ: FaqItem[] = [
  {
    question: "What is Lustra?",
    answer:
      "Lustra is a free browser tool that removes certain visible Gemini and Omni / Flow-style watermarks from images and videos. Processing is designed to run on your device.",
  },
  {
    question: "Is Lustra free?",
    answer:
      "Yes. The core tool is free to use. The site may display advertising to help keep access free.",
  },
  {
    question: "Does Lustra upload my files?",
    answer:
      "Media files are processed locally in your browser for watermark removal. They are not uploaded to Lustra servers as part of the core processing pipeline.",
  },
  {
    question: "Does Lustra process files locally?",
    answer:
      "Yes. Image and video cleaning run on your device in a supported browser. That keeps your media private during processing.",
  },
  {
    question: "What Gemini watermarks does Lustra support?",
    answer:
      "Lustra targets common visible Gemini sparkle-style marks and Omni / Flow-style corner watermarks. Results vary by file, compression, and watermark variant. Invisible or cryptographic watermarks are out of scope.",
  },
  {
    question: "Does Lustra remove watermarks from images?",
    answer:
      "Yes. Supported image formats include PNG, JPG, WEBP, and BMP. Drop files on the homepage tool to process them automatically.",
  },
  {
    question: "Does Lustra remove watermarks from videos?",
    answer:
      "Yes for MP4 videos in browsers with WebCodecs support (Chrome or Edge recommended). Image processing still works if video codecs are unavailable.",
  },
  {
    question: "Does Lustra preserve video resolution?",
    answer:
      "The pipeline is designed to keep the source resolution whenever technical conditions allow. Exact results can depend on the browser and codec path.",
  },
  {
    question: "Does Lustra preserve frame rate?",
    answer:
      "Where possible, frame rate is preserved during video cleaning. Complex or unusual encodings may behave differently.",
  },
  {
    question: "Does Lustra preserve audio?",
    answer:
      "Audio is copied without re-encoding when technically possible so dialogue and music stay aligned with the cleaned video.",
  },
  {
    question: "What file formats are supported?",
    answer:
      "Images: PNG, JPG, WEBP, BMP. Video: MP4 (browser-dependent). Bulk queues are supported so you can process multiple files in one session.",
  },
  {
    question: "Does Lustra require an account?",
    answer: "No. You can use the tool without creating an account or signing in.",
  },
  {
    question: "Is Lustra affiliated with Google?",
    answer:
      "No. Lustra is an independent project and is not affiliated with, endorsed by, or sponsored by Google, Gemini, Omni, or Flow.",
  },
];

function ctaBlock(extraLinks = true): string {
  const more = extraLinks
    ? `
    <p class="seo-more-links">
      Related guides:
      <a href="/gemini-watermark-remover">Gemini watermark remover</a> ·
      <a href="/gemini-image-watermark-remover">Image</a> ·
      <a href="/gemini-video-watermark-remover">Video</a> ·
      <a href="/omni-watermark-remover">Omni</a>
    </p>`
    : "";
  return `
    <div class="seo-cta">
      <a class="btn btn-primary" href="/">Open the free tool</a>
      <p class="seo-cta-note">Drop PNG, JPG, WEBP, BMP, or MP4 files — processing starts automatically in your browser.</p>
      ${more}
    </div>`;
}

export function homeSeoSectionsHtml(): string {
  const faqItems = HOME_FAQ.map(
    (item, i) => `
      <details class="faq-item"${i === 0 ? " open" : ""}>
        <summary>${item.question}</summary>
        <p>${item.answer}</p>
      </details>`
  ).join("");

  return `
    <section class="seo-content" aria-label="About Lustra and how it works">
      <div class="seo-grid">
        <article class="seo-card">
          <h2>What is Lustra?</h2>
          <p>
            Lustra is a free online tool for removing certain <strong>visible</strong>
            Gemini and Omni / Flow-style watermarks from media you own or are
            authorized to process. Everything runs in your browser so your files
            stay on your device during cleaning.
          </p>
        </article>

        <article class="seo-card">
          <h2>How Lustra works</h2>
          <p>
            Drop images or MP4 videos into the uploader above. Lustra detects
            supported corner watermarks, reconstructs the affected region, and
            prepares a cleaned file for download. A bulk queue lets you process
            multiple files in one session without signing up.
          </p>
        </article>

        <article class="seo-card">
          <h2>Gemini watermark remover</h2>
          <p>
            Generated images and clips often carry a small sparkle or badge in
            the corner. Lustra focuses on those common visible marks so you can
            reuse your own generations more cleanly. Read the dedicated
            <a href="/gemini-watermark-remover">Gemini watermark remover</a> guide
            for a broader overview.
          </p>
        </article>

        <article class="seo-card">
          <h2>Image watermark removal</h2>
          <p>
            For stills, Lustra supports PNG, JPG, WEBP, and BMP. The image path
            is optimized for the Gemini sparkle-style mark while aiming to keep
            the rest of the frame intact. See
            <a href="/gemini-image-watermark-remover">Gemini image watermark remover</a>
            for format details and workflow tips.
          </p>
        </article>

        <article class="seo-card">
          <h2>Video watermark removal</h2>
          <p>
            For MP4 video, Lustra processes frames in the browser (WebCodecs in
            Chrome/Edge recommended) and aims to keep resolution, frame rate,
            and audio where technically possible. Learn more on
            <a href="/gemini-video-watermark-remover">Gemini video watermark remover</a>.
          </p>
        </article>

        <article class="seo-card">
          <h2>Privacy &amp; local processing</h2>
          <p>
            Your media is not sent to Lustra servers for the core watermark
            removal pipeline. Hosting and optional advertising partners may see
            normal web traffic data (such as IP and page requests), separate
            from your file contents. Details are in the
            <a href="#privacy">Privacy Policy</a>.
          </p>
        </article>

        <article class="seo-card">
          <h2>Supported formats</h2>
          <p>
            <strong>Images:</strong> PNG, JPG, WEBP, BMP.<br />
            <strong>Video:</strong> MP4 (browser-dependent).<br />
            Unsupported files are skipped with a short notice so you know what to convert.
          </p>
        </article>

        <article class="seo-card">
          <h2>Video quality preservation</h2>
          <p>
            The video path is built to preserve source resolution and FPS when
            conditions allow, and to copy audio without re-encoding when possible.
            Heavily compressed sources or unusual codecs can still leave residual
            artifacts—results are best-effort, not a guarantee of perfection.
          </p>
        </article>
      </div>

      <div class="seo-links-bar">
        <span class="seo-links-label">Explore guides</span>
        <nav class="seo-links" aria-label="Product guides">
          <a href="/gemini-watermark-remover">Gemini watermark remover</a>
          <a href="/gemini-image-watermark-remover">Gemini image watermark remover</a>
          <a href="/gemini-video-watermark-remover">Gemini video watermark remover</a>
          <a href="/omni-watermark-remover">Omni watermark remover</a>
        </nav>
      </div>

      <section class="faq-section" id="faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Frequently asked questions</h2>
        <div class="faq-list">
          ${faqItems}
        </div>
      </section>
    </section>
  `;
}

const PAGE_BODIES: Record<Exclude<SeoRouteId, "home">, string> = {
  gemini: `
    <p class="seo-lead">
      Lustra is a free <strong>Gemini watermark remover</strong> that runs entirely
      in your browser. It targets common visible Gemini-style marks on images and
      videos so you can clean media you generated or are allowed to process—without
      creating an account.
    </p>

    <h2>Who this is for</h2>
    <p>
      Creators, marketers, and developers who export Gemini-assisted images or
      clips and want a straightforward way to remove the visible corner badge
      before using the file in their own projects. Lustra is not a general-purpose
      “erase any logo” editor; it is tuned for the watermark styles it knows.
    </p>

    <h2>What Lustra can clean</h2>
    <ul>
      <li>Visible Gemini sparkle-style marks commonly placed in a corner</li>
      <li>Related Omni / Flow-style corner watermarks on supported media</li>
      <li>Stills and MP4 video, depending on your browser capabilities</li>
    </ul>
    <p>
      Invisible, cryptographic, or non-supported watermark systems are outside
      the scope of this tool. Removal quality varies with compression, crop, and
      how the mark was burned into the file.
    </p>

    <h2>Images and video in one place</h2>
    <p>
      Use the same homepage uploader for both media types. Images process with a
      dedicated still-image pipeline; MP4s use a frame-aware video path when
      WebCodecs is available. Prefer
      <a href="/gemini-image-watermark-remover">image-focused guidance</a>
      or the
      <a href="/gemini-video-watermark-remover">video guide</a>
      if you only work with one format.
    </p>

    <h2>Local processing &amp; privacy</h2>
    <p>
      Watermark removal is designed to run on your device. File pixels and audio
      are not uploaded to Lustra servers as part of the core cleaning pipeline.
      That keeps sensitive drafts and client work on your machine while you clean.
    </p>

    <h2>How to use it</h2>
    <ol>
      <li>Open the free tool on the <a href="/">Lustra homepage</a>.</li>
      <li>Drop PNG, JPG, WEBP, BMP, or MP4 files (or browse to select them).</li>
      <li>Wait for the queue to finish—processing starts automatically.</li>
      <li>Download individual results or use “Download all” for a ZIP.</li>
    </ol>

    <h2>Independent tool</h2>
    <p>
      Lustra is independent and not affiliated with Google, Gemini, Omni, or Flow.
      Third-party names appear only to describe the watermark styles the tool
      supports. Always process media you own or have permission to modify.
    </p>
    ${ctaBlock()}
  `,

  "gemini-image": `
    <p class="seo-lead">
      The <strong>Gemini image watermark remover</strong> in Lustra is built for
      stills: PNG, JPG, WEBP, and BMP files that carry a visible Gemini sparkle
      or similar corner mark. Cleaning happens in the browser so originals never
      need to leave your device for the core pipeline.
    </p>

    <h2>Gemini sparkle on images</h2>
    <p>
      Many Gemini-generated images include a small decorative mark—often described
      as a sparkle—near a corner. That mark is part of the pixel data, so simply
      cropping can waste composition. Lustra reconstructs the watermark region so
      you can keep the full frame when the mark is supported.
    </p>

    <h2>Supported image formats</h2>
    <ul>
      <li><strong>PNG</strong> — lossless stills and screenshots</li>
      <li><strong>JPG / JPEG</strong> — common photo and social exports</li>
      <li><strong>WEBP</strong> — modern web-friendly stills</li>
      <li><strong>BMP</strong> — uncompressed bitmap sources</li>
    </ul>
    <p>
      Multi-file queues are supported: drop a batch and let the job list finish
      each image automatically.
    </p>

    <h2>Quality-minded cleanup</h2>
    <p>
      The image path focuses on the watermark area rather than re-encoding the
      entire photo with aggressive filters. You should still preview results:
      heavy compression, unusual colors, or partial crops of the mark can leave
      soft edges or residual texture. When a file does not match a supported
      pattern, Lustra reports that clearly instead of inventing a fake “success.”
    </p>

    <h2>Simple upload workflow</h2>
    <ol>
      <li>Go to the <a href="/">Lustra tool</a>.</li>
      <li>Drop one or more images onto the drop zone (or use Browse files).</li>
      <li>Watch the queue status until each job completes.</li>
      <li>Download the cleaned image, or ZIP several at once.</li>
    </ol>

    <h2>Privacy for stills</h2>
    <p>
      Image bytes are processed locally. That is especially useful for product
      mockups, unpublished art, or client work you do not want stored on a remote
      “upload then wait” service.
    </p>

    <h2>Need video instead?</h2>
    <p>
      MP4 cleaning uses a separate pipeline that cares about frames, FPS, and
      audio. See the
      <a href="/gemini-video-watermark-remover">Gemini video watermark remover</a>
      page, or the broader
      <a href="/gemini-watermark-remover">Gemini watermark remover</a>
      overview.
    </p>
    ${ctaBlock()}
  `,

  "gemini-video": `
    <p class="seo-lead">
      Lustra’s <strong>Gemini video watermark remover</strong> targets visible
      corner marks on MP4 clips—including Gemini, Omni, and Flow-style badges—
      by processing video in the browser. The goal is a cleaned file that keeps
      as much of the original presentation as the browser stack allows.
    </p>

    <h2>What kinds of video watermarks</h2>
    <p>
      Short generative clips often burn a small logo or sparkle into a fixed
      corner for the duration of the shot. Lustra is tuned for those consistent
      corner overlays rather than moving lower-thirds, channel bugs with complex
      animation, or full-frame burned-in text.
    </p>

    <h2>MP4 and browser requirements</h2>
    <p>
      Video cleaning relies on modern browser APIs (WebCodecs). <strong>Chrome</strong>
      or <strong>Edge</strong> are recommended. If WebCodecs is unavailable, the
      site still allows image processing and shows a clear compatibility notice
      for video.
    </p>

    <h2>Resolution, FPS, and audio</h2>
    <ul>
      <li><strong>Resolution</strong> — the pipeline aims to keep the source width and height.</li>
      <li><strong>Frame rate</strong> — FPS is preserved when the encode path permits.</li>
      <li><strong>Audio</strong> — tracks are copied without re-encoding when technically possible so speech and music stay in sync.</li>
    </ul>
    <p>
      These are design goals of the implementation, not absolute guarantees for
      every exotic codec profile or damaged file. Always spot-check important
      exports.
    </p>

    <h2>Quality-focused processing</h2>
    <p>
      Frames are cleaned where the watermark is expected, then remuxed into an
      MP4 you can download. Long clips take longer because work happens on your
      CPU/GPU in the tab—there is no hidden “server farm” absorbing the cost.
      That tradeoff is intentional: privacy and control over the file path.
    </p>

    <h2>How to clean a video</h2>
    <ol>
      <li>Open <a href="/">lustraaa.netlify.app</a> in Chrome or Edge.</li>
      <li>Drop an MP4 (or several) into the queue.</li>
      <li>Wait for frame processing to finish—progress appears per job.</li>
      <li>Download the result and verify a few frames plus the audio track.</li>
    </ol>

    <h2>Images vs video</h2>
    <p>
      Stills use a lighter path with PNG/JPG/WEBP/BMP support. If you only need
      photos, start with
      <a href="/gemini-image-watermark-remover">Gemini image watermark remover</a>.
      For Omni-specific wording, see
      <a href="/omni-watermark-remover">Omni watermark remover</a>.
    </p>
    ${ctaBlock()}
  `,

  omni: `
    <p class="seo-lead">
      Lustra includes a free <strong>Omni watermark remover</strong> path for
      visible Omni and Flow-style corner marks on images and videos. Like the
      rest of the product, cleaning runs locally so your files stay on your device
      during processing.
    </p>

    <h2>Omni / Flow-style marks</h2>
    <p>
      Generative video and image tools in the Omni / Flow family often place a
      compact badge in a corner of the output. Those marks are similar in spirit
      to other AI watermarks—fixed position, high contrast, visible on every
      frame or still—but they are not identical to every Gemini sparkle variant.
      Lustra’s detectors and cleaners are built around the corner-watermark
      patterns it supports, including these styles.
    </p>

    <h2>When to use this page’s workflow</h2>
    <ul>
      <li>You exported media from Omni / Flow-style tools with a corner badge</li>
      <li>You want browser-local cleaning without uploading to a remote editor</li>
      <li>You need both stills and MP4 support in one free tool</li>
    </ul>

    <h2>Images and video</h2>
    <p>
      Drop supported images (PNG, JPG, WEBP, BMP) or MP4 video on the homepage
      tool. Image jobs finish quickly for typical still sizes; video jobs iterate
      frames and are best run in Chrome or Edge. Resolution, frame rate, and
      audio preservation goals for video match the rest of Lustra’s video path.
    </p>

    <h2>Honest limits</h2>
    <p>
      Lustra does not claim to defeat every watermark system, nor to erase
      invisible identifiers. Heavily compressed clips, resized exports, or
      partially cropped badges can reduce quality. Preview before publishing.
    </p>

    <h2>Not affiliated</h2>
    <p>
      Lustra is an independent project. It is not affiliated with Google, Gemini,
      Omni, Flow, or related brands. Names are used only to describe the watermark
      styles users commonly ask about.
    </p>

    <h2>Related guides</h2>
    <p>
      For Gemini-first wording see
      <a href="/gemini-watermark-remover">Gemini watermark remover</a>,
      <a href="/gemini-image-watermark-remover">image-specific help</a>,
      and
      <a href="/gemini-video-watermark-remover">video-specific help</a>.
      All of them open into the same free on-device tool.
    </p>
    ${ctaBlock(false)}
  `,
};

export function seoPageBodyHtml(id: Exclude<SeoRouteId, "home">): string {
  return PAGE_BODIES[id];
}

export function seoPageShellHtml(
  id: Exclude<SeoRouteId, "home">,
  brandIcon: string,
  footerHtml = ""
): string {
  const route = SEO_ROUTES[id];
  return `
    <div class="app-shell legal-shell seo-shell">
      <header class="topbar">
        <a class="brand brand-link" href="/" aria-label="Lustra home">
          <div class="brand-mark" aria-hidden="true">${brandIcon}</div>
          <div class="brand-text">
            <div class="brand-name">Lustra</div>
            <div class="brand-tag">Gemini &amp; Omni cleaner</div>
          </div>
        </a>
        <a class="btn btn-ghost btn-sm" href="/">← Back to tool</a>
      </header>

      <article class="legal-page seo-page">
        <h1>${route.h1}</h1>
        <div class="legal-body seo-body">
          ${seoPageBodyHtml(id)}
        </div>
      </article>

      ${footerHtml}
    </div>
  `;
}
