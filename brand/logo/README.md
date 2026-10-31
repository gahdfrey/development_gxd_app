# CareVault logo: the Hub

The CareVault logo is built from **direction C, "The Hub"**, from the first logo exploration (see `../CAREVAULT_BRAND_BRIEF.md` and `../logo-concepts/`).

## The idea

- **The ring is a C, for Care.** It is split into four segments: the departments (lab, pharmacy, wards, billing) that CareVault connects.
- **The solid centre dot is the patient record**, held safely in the middle.
- **The spoke and end node leave through the C's opening**, like a key in a lock or a vault dial's handle. This is the record reaching out to the wider health system, the way FHIR export and national health information exchange do.
- Together the mark reads as **Care + Vault + connection**. It echoes the hub-and-spoke diagram already on the CareVault website.

## Files

Everything is flat, solid colour. There are no gradients, and every letter is converted to shapes, so files display correctly without the Geist font installed.

### `svg/`: master artwork (use these wherever possible)
| File | Use |
|---|---|
| `carevault-logo-horizontal.svg` | **Primary logo.** Website navbar, documents, email signatures |
| `carevault-logo-horizontal-reversed.svg` | On dark backgrounds (`#020617` / slate-950) |
| `carevault-logo-horizontal-white.svg` | On brand blue `#2563EB` or on photos |
| `carevault-logo-horizontal-black.svg` | One-colour print: lab results, receipts, stamps, fax |
| `carevault-logo-stacked*.svg` | Square-ish spaces: login page, splash screen, signage |
| `carevault-wordmark*.svg` | Where the mark already appears nearby |
| `carevault-mark*.svg` | Symbol alone at **24 px and above** |
| `carevault-mark-small*.svg` | Symbol alone **below 24 px**: a heavier ring with no segment gaps |
| `carevault-powered-by.svg` / `-reversed` | Co-branding next to a client hospital's logo ("Powered by CareVault") |
| `carevault-app-icon.svg` | App icon master (blue rounded tile, white mark) |
| `favicon.svg` | Modern browser favicon (uses the small mark) |
| `og-image.svg` | Link-preview image master |

### `png/`: ready-made raster exports
| File | Size | Use |
|---|---|---|
| `favicon.ico` | 16, 32, 48 | Browser tab (replaces Next.js's default `app/favicon.ico`) |
| `favicon-16/32/48.png` | as named | Individual favicon sizes |
| `apple-touch-icon.png` | 180 × 180 | iPhone/iPad home-screen icon (full-bleed; iOS rounds the corners) |
| `icon-192.png`, `icon-512.png` | 192, 512 | Android / web-app manifest (rounded tile) |
| `icon-512-maskable.png` | 512 | Android adaptive icon (full-bleed, mark inside the safe zone) |
| `social-avatar.png` | 400 × 400 | LinkedIn, X, WhatsApp profile picture (safe for circle crops) |
| `og-image.png` | 1200 × 630 | Link preview when carevault.com.ng is shared |
| `carevault-logo-horizontal.png` / `-reversed` | 1200 px wide | For Word, PowerPoint and anywhere SVG isn't accepted |

### `source/`: how the artwork is generated
- `mark.mjs`: the mark's geometry on a 64-unit grid
- `outline.py`: sets "CareVault" in Geist Bold with its kerning and converts it to outlines
- `build.mjs`: assembles every lockup and export

Change the geometry there, not by hand-editing the SVGs.

## Colours

| Role | Hex |
|---|---|
| CareVault Blue (mark, "Vault") | `#2563EB` |
| Ink ("Care" on light backgrounds) | `#0F172A` |
| Night (dark backgrounds) | `#020617` |
| Sky ("Vault" on dark backgrounds) | `#60A5FA` |
| Print | `#000000` |

These are the colours the app already uses (Tailwind blue-600, slate-900, slate-950, blue-400). **Never make the mark red**: red is reserved for critical clinical alerts in the product.

## Typography

The wordmark is **Geist Bold** (the app's own typeface) at −0.02 em tracking, with kerning applied. "Care" is in Ink and "Vault" is in Blue, so the security half of the name carries the brand colour.

## Clear space and minimum size

- **Clear space:** keep empty space around the logo at least equal to **the diameter of the centre dot** on every side. That's about 30% of the mark's height.
- **Minimum sizes**

| Asset | Screen | Print |
|---|---|---|
| Horizontal logo | 110 px wide | 30 mm wide |
| Stacked logo | 64 px wide | 20 mm wide |
| Mark (`carevault-mark`) | 24 px | 8 mm |
| Small mark (`carevault-mark-small`) | 12 px | 4 mm |
| Powered-by | 100 px wide | 28 mm wide |

## Don'ts

- Don't add gradients, shadows, glows or outlines.
- Don't recolour the mark (especially red), and don't put the blue mark on the blue background.
- Don't stretch, rotate or rearrange the mark and wordmark, or change the spacing between them.
- Don't close the C's opening or remove the spoke. Together they carry the idea.
- Don't use the four-segment mark below 24 px. Use the small mark instead.
- Don't retype the wordmark in a font. Use the files.
