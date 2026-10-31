# CareVault logo: the Keyhole C

The CareVault logo is **Keyhole C**. It came out of round 3, which refined the round 2 "Hub" direction (see `../CAREVAULT_BRAND_BRIEF.md`, `../logo-concepts/` and `../logo-round3/`).

## The idea

- **The C is Care.** It is a single heavy, confident shape.
- **The C's inner space is a keyhole: the Vault.** It has a round head at the centre and a slot that widens out through the C's opening.
- **The dot in the keyhole's head is the patient record**, held at the centre of the vault.
- **The slot is the only way in or out.** Access is deliberate and controlled, the way CareVault handles consent, permissions and audit trails.

## Construction

Built on a 64-unit grid (`source/mark.mjs`):

| Part | Value |
|---|---|
| Outer radius | 26 |
| Keyhole-head radius | 13 (half the outer radius) |
| Record dot radius | 5 (the head radius ÷ φ², where φ is the golden ratio) |
| Slot width | 5 at the head, widening to 16 at the rim |
| Jaw corners | rounded, 1.75 radius |

**Optical corrections**
- **Reversed artwork is drawn slightly lighter.** White on dark looks heavier (an effect called irradiation), so the white mark's keyhole is opened by about 0.4 units to compensate. The `-white` and `-reversed` files use this drawing.
- **Centred by what you see, not by the circle.** The opening makes the mark's right edge stop short of the full circle, so placing it by its visible edges nudges it right and balances it.

**One drawing works at every size**, from 16 px up. There is no separate small version.

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
| `carevault-mark.svg` / `-white` / `-black` | The symbol alone, at any size |
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
- `outline.py`: sets "CareVault" in Geist Bold with its kerning and converts it to outlines
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

The wordmark is **Geist Bold** (the app's own typeface) at −0.02 em tracking, with kerning applied. Bold matches the weight of the heavy mark. "Care" is in Ink and "Vault" is in Blue, so the security half of the name carries the brand colour.

## Clear space and minimum size

- **Clear space:** keep empty space around the logo at least equal to **the keyhole head's radius** on every side. That's a quarter of the mark's height.
- **Minimum sizes**

| Asset | Screen | Print |
|---|---|---|
| Horizontal logo | 100 px wide | 28 mm wide |
| Stacked logo | 56 px wide | 18 mm wide |
| Mark | 16 px | 5 mm |
| Powered-by | 100 px wide | 28 mm wide |

## Don'ts

- Don't add gradients, shadows, glows or outlines.
- Don't recolour the mark (especially red), and don't put the blue mark on the blue background.
- Don't stretch, rotate or rearrange the mark and wordmark, or change the spacing between them.
- Don't close the slot or remove the record dot. Together they carry the idea.
- Don't use the blue-background drawing (`carevault-mark.svg`) reversed out on dark. Use `carevault-mark-white.svg`, which is optically corrected.
- Don't retype the wordmark in a font. Use the files.
