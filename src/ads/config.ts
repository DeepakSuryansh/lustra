/**
 * Google AdSense settings
 * ----------------------
 * 1. AdSense → Sites → add your live URL
 * 2. Create display ad units (responsive / vertical / multipurpose)
 * 3. Paste IDs below, set enabled: true
 * 4. npm run build → upload dist to Netlify
 *
 * Publisher ID: ca-pub-1234567890123456
 * Slot ID:      1234567890
 */

export const ADSENSE = {
  /** true only after real IDs are pasted */
  enabled: false,

  client: "ca-pub-XXXXXXXXXXXXXXXX",

  slots: {
    /** Full-width under hero */
    top: "0000000001",
    /** Left of drop zone (desktop) */
    left: "0000000002",
    /** Right of drop zone (desktop) */
    right: "0000000003",
    /** Under queue / before footer */
    bottom: "0000000004",
    /** Extra strip under sides row (optional high density) */
    mid: "0000000005",
  },
} as const;

export function isAdsReady(): boolean {
  if (!ADSENSE.enabled) return false;
  if (!ADSENSE.client.startsWith("ca-pub-") || ADSENSE.client.includes("XXXX")) {
    return false;
  }
  // At least one real slot configured
  return Object.values(ADSENSE.slots).some(
    (id) => id && !id.startsWith("000000000")
  );
}
