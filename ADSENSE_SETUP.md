# Google AdSense — Lustra (step by step)

You already have an AdSense account. Follow this.

## 1) Add your live site in AdSense

1. Open [https://www.google.com/adsense](https://www.google.com/adsense)
2. **Sites** → **Add site**
3. Enter your live URL, e.g.  
   `https://lustra-cleaner.netlify.app`
4. Save and wait for site review if required

## 2) Create ad units (max coverage)

1. AdSense → **Ads** → **By ad unit**
2. Create these **Display** units (responsive / multipurpose / vertical where available):

| Name in AdSense | Used as | Best type |
|-----------------|---------|-----------|
| Lustra Top | `top` | Display responsive |
| Lustra Left | `left` | Vertical / multipurpose (160×600 style) |
| Lustra Right | `right` | Vertical / multipurpose |
| Lustra Mid | `mid` | Display responsive |
| Lustra Bottom | `bottom` | Display rectangle / responsive |

3. Copy:
   - **Publisher ID** → `ca-pub-xxxxxxxxxxxxxxxx`
   - Each **slot ID** → numbers only

## 3) Paste IDs into the project

Edit file:

```
D:\lustra\src\ads\config.ts
```

Example:

```ts
export const ADSENSE = {
  enabled: true,
  client: "ca-pub-1234567890123456",
  slots: {
    top: "1111111111",
    left: "2222222222",
    right: "3333333333",
    mid: "4444444444",
    bottom: "5555555555",
  },
} as const;
```

## 4) Build & deploy (same Netlify link)

```powershell
cd D:\lustra
npm run build
```

Netlify → your site → **Deploys** → drop folder:

```
D:\lustra\dist
```

## 5) Check ads

- Open live site in Chrome (not always localhost)
- Wait a few minutes / hours for first fill
- Ad blockers hide ads — test in Incognito with blockers off
- Empty space = wrong IDs, site not approved, or no fill yet

## Placement (already in code)

```
        [ Top banner ad ]
   [Left] [ Drop zone ] [Right]   ← desktop sides fill empty space
   [Left] [ Queue     ] [Right]
        [ Mid banner ad ]
        [ Bottom rectangle ]
        [ Footer ]
```

| Slot | Where |
|------|--------|
| top | Under hero |
| left / right | Both sides of drop zone (desktop ≥1100px) |
| mid | Under workspace |
| bottom | Above footer |

On mobile, side rails hide; top/mid/bottom still show.

## Important rules

- Do **not** click your own ads
- Do **not** ask friends to click ads
- Keep Privacy Policy + Terms online (already on site)
- Invalid clicks can ban AdSense

## Auto ads (optional)

AdSense also has **Auto ads** (one script for whole site).  
This project uses **manual units** for cleaner control. You can enable Auto ads in AdSense UI in addition if you want more coverage.
