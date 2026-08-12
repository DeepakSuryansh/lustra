/** Canonical site configuration for SEO metadata. */

export const SITE_URL = "https://lustraaa.netlify.app";
export const SITE_NAME = "Lustra";
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;

export const HOME_TITLE = "Lustra — Gemini & Omni Watermark Remover";

export const HOME_ALTERNATE_NAME =
  "Lustra — Gemini & Omni Watermark Remover";

export const HOME_DESCRIPTION =
  "Free browser tool to remove visible Gemini and Omni watermarks from images and videos. Processing stays on your device—no account, no upload to our servers.";

export type SeoRouteId =
  | "home"
  | "gemini"
  | "gemini-image"
  | "gemini-video"
  | "omni";

export interface SeoRoute {
  id: SeoRouteId;
  path: string;
  title: string;
  description: string;
  h1: string;
}

export const SEO_ROUTES: Record<Exclude<SeoRouteId, "home">, SeoRoute> = {
  gemini: {
    id: "gemini",
    path: "/gemini-watermark-remover",
    title: "Gemini Watermark Remover – Free Online Tool | Lustra",
    description:
      "Remove visible Gemini-style watermarks from images and videos in your browser with Lustra. Free, local processing—no account required.",
    h1: "Gemini Watermark Remover",
  },
  "gemini-image": {
    id: "gemini-image",
    path: "/gemini-image-watermark-remover",
    title: "Gemini Image Watermark Remover – Free Online | Lustra",
    description:
      "Strip Gemini sparkle watermarks from PNG, JPG, WEBP, and BMP images in your browser. Free, private, quality-focused image cleanup with Lustra.",
    h1: "Gemini Image Watermark Remover",
  },
  "gemini-video": {
    id: "gemini-video",
    path: "/gemini-video-watermark-remover",
    title: "Gemini Video Watermark Remover – Free Online | Lustra",
    description:
      "Remove Gemini, Omni, and Flow-style corner watermarks from MP4 videos in your browser. Aims to keep resolution, frame rate, and audio intact.",
    h1: "Gemini Video Watermark Remover",
  },
  omni: {
    id: "omni",
    path: "/omni-watermark-remover",
    title: "Omni Watermark Remover – Free Online Tool | Lustra",
    description:
      "Clean Omni and Flow-style corner watermarks from images and videos with Lustra. Browser-local processing—free and private.",
    h1: "Omni Watermark Remover",
  },
};

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return `${SITE_URL}/`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

export function matchSeoRoute(
  pathname: string
): SeoRoute | { id: "home"; path: "/"; title: string; description: string; h1: string } | null {
  const path = normalizePath(pathname);
  if (path === "/") {
    return {
      id: "home",
      path: "/",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      h1: "Gemini & Omni Watermark Remover",
    };
  }
  for (const route of Object.values(SEO_ROUTES)) {
    if (route.path === path) return route;
  }
  return null;
}
