import {
  OG_IMAGE_URL,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "./site";

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: Record<string, unknown> | null): void {
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export interface PageMetaOptions {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
}

export function applyPageMeta(opts: PageMetaOptions): void {
  const url = absoluteUrl(opts.path);
  const type = opts.type ?? "website";

  document.title = opts.title;

  upsertMeta("name", "description", opts.description);
  upsertMeta("name", "robots", "index, follow");

  upsertLink("canonical", url);

  upsertMeta("property", "og:title", opts.title);
  upsertMeta("property", "og:description", opts.description);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", OG_IMAGE_URL);
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:locale", "en_US");

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", opts.title);
  upsertMeta("name", "twitter:description", opts.description);
  upsertMeta("name", "twitter:image", OG_IMAGE_URL);

  if (opts.jsonLd === null) {
    setJsonLd("lustra-jsonld", null);
  } else if (opts.jsonLd) {
    const payload = Array.isArray(opts.jsonLd)
      ? { "@context": "https://schema.org", "@graph": opts.jsonLd }
      : opts.jsonLd["@context"]
        ? opts.jsonLd
        : { "@context": "https://schema.org", ...opts.jsonLd };
    setJsonLd("lustra-jsonld", payload as Record<string, unknown>);
  }
}

export function websiteSchema(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description:
      "Free browser tool to remove visible Gemini and Omni watermarks from images and videos.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
    },
  };
}

export function webAppSchema(): Record<string, unknown> {
  return {
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with JavaScript enabled",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Remove visible Gemini and Omni-style watermarks from images and MP4 videos. Processing runs locally in your browser.",
  };
}

export function faqSchema(
  items: { question: string; answer: string }[]
): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
