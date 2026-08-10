import { ADSENSE, isAdsReady } from "./config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptInjected = false;

export function ensureAdSenseScript(): void {
  if (!isAdsReady() || scriptInjected) return;
  if (document.querySelector('script[data-lustra-adsense="1"]')) {
    scriptInjected = true;
    return;
  }

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.client}`;
  s.crossOrigin = "anonymous";
  s.dataset.lustraAdsense = "1";
  document.head.appendChild(s);
  scriptInjected = true;
}

export type AdFormat = "horizontal" | "rectangle" | "vertical";

/** HTML for one display ad unit. */
export function adUnitHtml(
  slot: string,
  format: AdFormat = "horizontal"
): string {
  // Skip placeholder slots so empty units don't burn inventory
  const isPlaceholder = !slot || slot.startsWith("000000000");
  if (!isAdsReady() || isPlaceholder) {
    return `<div class="ad-slot ad-slot--empty ad-slot--${format}" aria-hidden="true"></div>`;
  }

  const minH =
    format === "vertical" ? "600px" : format === "rectangle" ? "250px" : "90px";

  // Vertical units work better as multipurpose / vertical skyscraper
  const extra =
    format === "vertical"
      ? `data-ad-format="vertical"`
      : `data-ad-format="auto" data-full-width-responsive="true"`;

  return `
    <div class="ad-slot ad-slot--${format}">
      <ins class="adsbygoogle"
        style="display:block;min-height:${minH};width:100%"
        data-ad-client="${ADSENSE.client}"
        data-ad-slot="${slot}"
        ${extra}></ins>
    </div>
  `;
}

export function pushAds(): void {
  if (!isAdsReady()) return;
  ensureAdSenseScript();

  requestAnimationFrame(() => {
    try {
      const nodes = document.querySelectorAll("ins.adsbygoogle");
      nodes.forEach((el) => {
        if (el.getAttribute("data-adsbygoogle-status")) return;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      });
    } catch {
      /* adblock / not loaded */
    }
  });
}
