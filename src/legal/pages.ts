/** Legal & info pages for Lustra (static SPA content). */

export const CONTACT_EMAIL = "er.deepaksahni@gmail.com";
export const SITE_NAME = "Lustra";
export const COPYRIGHT_YEAR = new Date().getFullYear();

export type LegalPageId =
  | "privacy"
  | "terms"
  | "disclaimer"
  | "contact"
  | "about";

export interface LegalPage {
  id: LegalPageId;
  title: string;
  html: string;
}

function section(title: string, ...body: string[]): string {
  return `<section class="legal-section"><h2>${title}</h2>${body.join("")}</section>`;
}

function p(...paras: string[]): string {
  return paras.map((t) => `<p>${t}</p>`).join("");
}

function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

export const LEGAL_PAGES: Record<LegalPageId, LegalPage> = {
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    html: [
      p(
        `<strong>Last updated:</strong> ${COPYRIGHT_YEAR}.`,
        `${SITE_NAME} (“we”, “our”, “the Service”) is a browser-based tool that removes certain visible AI watermarks from images and videos. This Privacy Policy explains what information is involved when you use the Service.`
      ),
      section(
        "1. Core principle — local processing",
        p(
          "Your media files (images and videos) are processed <strong>locally in your own browser</strong> on your device. We do not operate a server that receives, stores, or analyzes the content of your uploaded media files for watermark removal.",
          "File names, pixels, audio, and video data from your media are not intentionally transmitted to our servers as part of the core processing pipeline."
        )
      ),
      section(
        "2. Information we do not collect from your media",
        p("In the normal operation of the watermark removal engine, we do not collect:"),
        ul([
          "The content of your images or videos",
          "Original or cleaned media files for storage on our servers",
          "Biometric analysis of people in your files",
          "Audio transcripts of your videos",
        ])
      ),
      section(
        "3. Information that may be collected automatically",
        p(
          "Like most websites, hosting providers and analytics or advertising partners (if enabled) may automatically receive limited technical data when you visit the site, such as:"
        ),
        ul([
          "IP address (as seen by the host or ad network)",
          "Browser type, device type, and approximate region",
          "Pages visited, date/time, and referral URL",
          "Cookies or similar technologies used by the host or ad partners",
        ]),
        p(
          "This is standard web traffic data and is separate from your media files. We use reputable hosting (for example Netlify or similar). Their privacy policies also apply to infrastructure logs."
        )
      ),
      section(
        "4. Advertising",
        p(
          "The Service may display third-party advertisements (for example Google AdSense or similar networks) to keep the tool free. Ad partners may use cookies and similar technologies to show ads, measure performance, and (where allowed) personalize ads.",
          "You can control cookies through your browser settings and, where available, ad personalization settings provided by Google or other networks. We do not sell your media files to advertisers."
        )
      ),
      section(
        "5. Contact messages",
        p(
          `If you email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>, we will receive whatever you include in that message (your email address, name if provided, and message content) so we can respond. We use that information only for support and communication related to the Service.`
        )
      ),
      section(
        "6. Children’s privacy",
        p(
          "The Service is not directed at children under 13 (or the minimum age required in your jurisdiction). Do not use the Service if you are under the applicable age without appropriate parental consent where required."
        )
      ),
      section(
        "7. Third-party services",
        p(
          "The site may load scripts from third parties (hosting CDN, fonts if any, advertising). Those parties process data under their own policies. We encourage you to review them."
        )
      ),
      section(
        "8. Data security",
        p(
          "Because media processing happens on your device, the main security of your files depends on your device and browser. We take reasonable steps to secure the website itself, but no online service can guarantee absolute security of web traffic metadata."
        )
      ),
      section(
        "9. Changes",
        p(
          "We may update this Privacy Policy from time to time. The “Last updated” date will change when we do. Continued use of the Service after changes means you accept the updated policy."
        )
      ),
      section(
        "10. Contact",
        p(
          `Questions about privacy: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`
        )
      ),
    ].join(""),
  },

  terms: {
    id: "terms",
    title: "Terms of Service",
    html: [
      p(
        `<strong>Last updated:</strong> ${COPYRIGHT_YEAR}.`,
        `By accessing or using ${SITE_NAME} (the “Service”), you agree to these Terms of Service. If you do not agree, do not use the Service.`
      ),
      section(
        "1. Description of the Service",
        p(
          `${SITE_NAME} provides a free, browser-based tool intended to help remove certain visible watermarks commonly associated with Gemini / Omni / Flow-style generated media. Processing is designed to run locally in your browser.`,
          "Features, quality, and supported formats may change over time without notice."
        )
      ),
      section(
        "2. Eligibility and acceptable use",
        p("You agree to use the Service only for lawful purposes. You represent that:"),
        ul([
          "You own the media you process, or you have permission / legal right to process it",
          "You will not use the Service to infringe copyrights, trademarks, or other rights",
          "You will not use the Service to conceal unauthorized distribution of others’ content",
          "You will not attempt to attack, overload, scrape abusively, or reverse-engineer the Service in a harmful way",
          "You will not use the Service for fraud, malware distribution, or other illegal activity",
        ])
      ),
      section(
        "3. No account required",
        p(
          "The Service is currently offered without mandatory account registration. We may introduce optional accounts or features later. Free access may be supported by advertising."
        )
      ),
      section(
        "4. Intellectual property",
        p(
          `The ${SITE_NAME} name, branding, website design, and software implementation are protected by applicable intellectual property laws.`,
          `© ${COPYRIGHT_YEAR} ${SITE_NAME}. All rights reserved.`,
          "You retain rights to your own media. We do not claim ownership of files you process locally in your browser.",
          "Gemini, Omni, Flow, Google, and related marks are trademarks of their respective owners. The Service is not affiliated with, endorsed by, or sponsored by Google LLC or related entities."
        )
      ),
      section(
        "5. No warranty",
        p(
          'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
          "We do not warrant that watermark removal will be complete, perfect, artifact-free, or suitable for any particular professional, commercial, or legal purpose. Results vary by file, browser, and watermark variant."
        )
      ),
      section(
        "6. Limitation of liability",
        p(
          "To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, goodwill, or business opportunities arising from your use of the Service.",
          "Our total liability for any claim related to the Service shall not exceed the amount you paid us for the Service in the twelve (12) months before the claim (which is currently zero for free use)."
        )
      ),
      section(
        "7. Indemnity",
        p(
          "You agree to indemnify and hold harmless the Service operators from claims, damages, losses, and expenses (including reasonable legal fees) arising from your misuse of the Service or violation of these Terms or any law."
        )
      ),
      section(
        "8. Third-party content and ads",
        p(
          "The Service may display third-party advertisements or links. We are not responsible for third-party sites, products, or privacy practices."
        )
      ),
      section(
        "9. Changes and termination",
        p(
          "We may modify, suspend, or discontinue the Service at any time. We may update these Terms; continued use after updates constitutes acceptance."
        )
      ),
      section(
        "10. Governing law",
        p(
          "These Terms are governed by the laws applicable in the operator’s jurisdiction, without regard to conflict-of-law principles, unless mandatory consumer protections in your country require otherwise."
        )
      ),
      section(
        "11. Contact",
        p(
          `For questions about these Terms: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`
        )
      ),
    ].join(""),
  },

  disclaimer: {
    id: "disclaimer",
    title: "Disclaimer",
    html: [
      p(
        `<strong>Last updated:</strong> ${COPYRIGHT_YEAR}.`,
        `Please read this disclaimer carefully before using ${SITE_NAME}.`
      ),
      section(
        "1. Not affiliated with Google / Gemini / Omni",
        p(
          `${SITE_NAME} is an independent tool. It is not affiliated with, endorsed by, or sponsored by Google LLC, Gemini, Omni, Flow, or any related company. All third-party names and logos are property of their respective owners and used only for identification.`
        )
      ),
      section(
        "2. Intended use",
        p(
          "The Service is intended for users who process media they own or are authorized to process (for example, content they generated). You are solely responsible for ensuring your use complies with applicable laws and the terms of any platform that produced the media."
        )
      ),
      section(
        "3. No guarantee of complete removal",
        p(
          "Visible watermark removal may leave residual traces, artifacts, or imperfect reconstruction—especially on compressed video. Invisible or cryptographic watermarks (if any) are outside the scope of this tool and may survive processing."
        )
      ),
      section(
        "4. Quality and compatibility",
        p(
          "Output quality depends on your browser, device, codec support (WebCodecs), and source file. We do not guarantee identical quality to any other product. Audio is copied without re-encoding when technically possible; edge cases may differ."
        )
      ),
      section(
        "5. No legal, professional, or platform advice",
        p(
          "Nothing on this site is legal advice. If you need advice about copyright, platform rules, or commercial use, consult a qualified professional."
        )
      ),
      section(
        "6. Ads and free access",
        p(
          "The Service may be free and supported by advertising. Ad content is provided by third parties; we do not control every ad shown."
        )
      ),
      section(
        "7. Your responsibility",
        p(
          "You accept full responsibility for files you process and how you use the outputs. Do not use the Service to violate others’ rights or any law."
        )
      ),
      section(
        "8. Contact",
        p(
          `Questions: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`
        )
      ),
    ].join(""),
  },

  contact: {
    id: "contact",
    title: "Contact",
    html: [
      p(
        `We’d like to hear from you — feedback, bug reports, or business questions.`
      ),
      section(
        "Email",
        p(
          `<a class="contact-email" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`,
          "Please include a clear subject line (for example: “Lustra bug”, “Feature request”, or “Business”)."
        )
      ),
      section(
        "What to include for technical issues",
        ul([
          "Browser name and version (Chrome / Edge recommended)",
          "Whether the file is image or video, and approximate resolution",
          "What you expected vs what happened",
          "Do <strong>not</strong> email confidential media unless necessary; describe the issue first",
        ])
      ),
      section(
        "Response time",
        p(
          "We try to reply when possible, but free tools may have limited support capacity. Thank you for your patience."
        )
      ),
      section(
        "Operator",
        p(
          `${SITE_NAME} — operated independently.`,
          `© ${COPYRIGHT_YEAR} ${SITE_NAME}. All rights reserved.`
        )
      ),
    ].join(""),
  },

  about: {
    id: "about",
    title: "About Lustra",
    html: [
      p(
        `${SITE_NAME} is a free, privacy-minded browser tool that removes certain visible Gemini / Omni / Flow-style corner watermarks from images and videos.`,
        "Processing runs on your device. We built it to be simple: drop files, process automatically, download clean results."
      ),
      section(
        "Highlights",
        ul([
          "No account required",
          "No media upload to our servers for processing",
          "Images and MP4 videos (browser-dependent)",
          "Bulk queue and download",
          "Supported by ads so the core tool can stay free",
        ])
      ),
      section(
        "Contact",
        p(
          `Email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`
        )
      ),
      section(
        "Legal",
        p(
          `© ${COPYRIGHT_YEAR} ${SITE_NAME}. All rights reserved.`,
          "Not affiliated with Google or Gemini."
        )
      ),
    ].join(""),
  },
};

export function getLegalPage(id: string | null): LegalPage | null {
  if (!id) return null;
  if (id in LEGAL_PAGES) return LEGAL_PAGES[id as LegalPageId];
  return null;
}
