# CareVault logo: Hub II

The CareVault logo is **Hub II**. It came out of round 3, which refined the round 2 "Hub" direction (see `../CAREVAULT_BRAND_BRIEF.md`, `../logo-concepts/`, `../logo-round3/` and `../logo-round4/`).

## The idea

- **The ring is a C, for Care.** It is split into three mirrored segments: patients, clinicians and organisations.
- **The solid centre is the patient record**, held safely at the heart of the vault.
- **A spoke runs from the record out through the C's opening** to a node.
- **The node sits on the ring's own centre line**, the same size as the ring's rounded ends, so it reads as the ring's missing piece. The record joins the wider health system without leaving the vault's structure.

## Construction

Every part comes from one module, **t = the ring's thickness (8 on a 64-unit grid)**, in `source/mark.mjs`:

| Part | Value |
|---|---|
| Ring | thickness t, outer radius 26, opening ±45° |
| Record (centre dot) | diameter 2t |
| Node and ring ends | circles of diameter t, on the ring's centre line |
| Spoke and segment gaps | t/2 |

**Optical corrections**
- **Reversed artwork is drawn slightly lighter.** White on dark looks heavier (an effect called irradiation), so the white drawings use t = 7.6. The `-white` and `-reversed` files use them.
- **A separate small mark for under 24 px.** At small sizes the segment gaps blur, so `carevault-mark-small*.svg` (and the favicon) use one unbroken, slightly heavier ring (t = 9).

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
| `carevault-mark.svg` / `-white` / `-black` | The symbol alone, at **24 px and above** |
| `carevault-mark-small.svg` / `-white` / `-black` | The symbol alone, **under 24 px** (no segment gaps) |
| `carevault-powered-by.svg` / `-reversed` | Co-branding next to a client hospital's logo ("Powered by CareVault") |
| `carevault-app-icon.svg` | App icon master (blue rounded tile, white mark) |
| `favicon.svg` | Modern browser favicon |
| `og-image.svg` | Link-preview image master |

### `png/`: ready-made raster exports
| File | Size | Use |
|---|---|---|
| `favicon.ico` | 16, 32, 48 | Browser tab (`app/favicon.ico`) |
| `favicon-16/32/48.png` | as named | Individual favicon sizes |
| `apple-touch-icon.png` | 180 × 180 | iPhone/iPad home-screen icon (full-bleed; iOS rounds the corners) |
| `icon-192.png`, `icon-512.png` | 192, 512 | Android / web-app manifest (rounded tile) |
| `icon-512-maskable.png` | 512 | Android adaptive icon (full-bleed, mark inside the safe zone) |
| `social-avatar.png` | 400 × 400 | LinkedIn, X, WhatsApp profile picture (safe for circle crops) |
| `og-image.png` | 1200 × 630 | Link preview when carevault.com.ng is shared |
| `carevault-logo-horizontal.png` / `-reversed` | 1200 px wide | For Word, PowerPoint and anywhere SVG isn't accepted |

### `source/`: how the artwork is generated
- `mark.mjs`: the mark's geometry
- `outline.py`: sets "CareVault" in Geist SemiBold with its kerning and converts it to outlines
- `build.mjs`: assembles every lockup and export (`node build.mjs <glyphs.json> ..`)

Change the geometry there, not by hand-editing the SVGs. If you change the mark, copy the new path data into `app/components/ui/Logo.tsx` and the icons into `app/` and `public/brand/`.

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

The wordmark is **Geist SemiBold** (the app's own typeface) at −0.025 em tracking, with kerning applied. SemiBold matches the weight of the ring. "Care" is in Ink and "Vault" is in Blue, so the security half of the name carries the brand colour.

## Clear space and minimum size

- **Clear space:** keep empty space around the logo at least equal to **the record (centre dot) diameter** on every side. That's about 30% of the mark's height.
- **Minimum sizes**

| Asset | Screen | Print |
|---|---|---|
| Horizontal logo | 110 px wide | 30 mm wide |
| Stacked logo | 64 px wide | 20 mm wide |
| Mark | 24 px | 8 mm |
| Small mark | 12 px | 4 mm |
| Powered-by | 100 px wide | 28 mm wide |

## Don'ts

- Don't add gradients, shadows, glows or outlines.
- Don't recolour the mark (especially red), and don't put the blue mark on the blue background.
- Don't stretch, rotate or rearrange the mark and wordmark, or change the spacing between them.
- Don't close the C's opening, or remove the spoke or node. Together they carry the idea.
- Don't use the three-segment mark below 24 px. Use the small mark instead.
- Don't use the blue-background drawing (`carevault-mark.svg`) reversed out on dark. Use `carevault-mark-white.svg`, which is optically corrected.
- Don't retype the wordmark in a font. Use the files.
