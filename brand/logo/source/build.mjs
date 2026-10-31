// Builds the CareVault logo set (SVG + PNG + ICO) from the Keyhole C mark geometry and the
// outlined Geist wordmark. Usage: node build.mjs <glyphs.json> <outDir>
import { createRequire } from "module";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fullMark, reversedMark } from "./mark.mjs";

const appRequire = createRequire("/Users/tiito/Desktop/development_gxd_app/package.json");
const sharp = appRequire("sharp");
const { SVGPathData } = appRequire("svg-pathdata");

const [glyphFile, outDir] = process.argv.slice(2);
const G = JSON.parse(readFileSync(glyphFile, "utf8"));
mkdirSync(join(outDir, "svg"), { recursive: true });
mkdirSync(join(outDir, "png"), { recursive: true });

const BLUE = "#2563EB", BLUE_400 = "#60A5FA", INK = "#0F172A", GREY = "#64748B";
const r = (n) => Number(n.toFixed(2));

// Visual bounds of each mark on its 64 grid (measured). The mouth leaves the right edge short
// of the circle, so centring on these bounds nudges the mark right, which balances it optically.
// "rev" is the light-on-dark drawing with a slightly opened counter.
const MARKS = {
  full: { d: fullMark(), x0: 6, y0: 6, x1: 56.25, y1: 58 },
  // Same box as "full" so every colourway of a lockup shares one layout.
  rev: { d: reversedMark(), x0: 6, y0: 6, x1: 56.25, y1: 58 },
};

const place = (d, k, tx, ty) => new SVGPathData(d).scale(k, k).translate(tx, ty).round(100).encode();

// Mark scaled to `h` visual height, its visual top-left at (x, y).
function markAt(kind, x, y, h) {
  const m = MARKS[kind];
  const k = h / (m.y1 - m.y0);
  return { d: place(m.d, k, x - m.x0 * k, y - m.y0 * k), w: (m.x1 - m.x0) * k, h };
}

// A string from glyphs.json, scaled so its cap height is `cap`, baseline at (x, baseline).
function textAt(key, x, baseline, cap) {
  const t = G[key];
  const k = cap / t.capHeight;
  const [bx0, by0, bx1, by1] = t.bounds;
  return {
    spans: t.spans.map((d) => place(d, k, x, baseline)),
    w: t.width * k,
    top: baseline + by0 * k, bottom: baseline + by1 * k,
    left: x + bx0 * k, right: x + bx1 * k,
  };
}

function svgDoc(vb, body, title) {
  const [x, y, w, h] = vb.map(r);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">\n<title>${title}</title>\n${body}\n</svg>\n`;
}
const path = (d, fill) => `<path fill="${fill}" d="${d}"/>`;

// Colourways: [mark, "Care", "Vault", mark drawing]
const WAYS = {
  "": [BLUE, INK, BLUE, "full"],                         // full colour on light backgrounds
  "-reversed": ["#FFFFFF", "#FFFFFF", BLUE_400, "rev"],  // on dark (#020617)
  "-white": ["#FFFFFF", "#FFFFFF", "#FFFFFF", "rev"],    // on brand blue or photos
  "-black": ["#000000", "#000000", "#000000", "full"],   // one-colour print
};

const files = {};
const save = (name, svg) => { files[name] = svg; writeFileSync(join(outDir, "svg", name), svg); };

// --- Symbol ---------------------------------------------------------------
// One drawing works at every size, so there is no separate small mark.
for (const [suffix, [mc, , , kind]] of Object.entries(WAYS)) {
  if (suffix === "-reversed") continue; // on dark, use the white mark
  save(`carevault-mark${suffix}.svg`, svgDoc([0, 0, 64, 64], path(MARKS[kind].d, mc), "CareVault"));
}

// --- Horizontal lockup ----------------------------------------------------
// Mark 52 tall; wordmark cap height 24 (0.46 of the mark), centred on the mark's centre line.
function horizontal(mc, cc, vc, kind) {
  const mark = markAt(kind, 0, 0, 52);
  const cap = 24;
  const text = textAt("wordmark", mark.w + 13, 26 + cap / 2, cap);
  const W = text.right;
  return {
    vb: [0, 0, W, 52],
    body: [path(mark.d, mc), path(text.spans[0], cc), path(text.spans[1], vc)].join("\n"),
  };
}
for (const [suffix, c] of Object.entries(WAYS)) {
  const h = horizontal(...c);
  save(`carevault-logo-horizontal${suffix}.svg`, svgDoc(h.vb, h.body, "CareVault"));
}

// --- Stacked lockup -------------------------------------------------------
function stacked(mc, cc, vc, kind) {
  const cap = 20;
  const probe = textAt("wordmark", 0, 0, cap);
  const W = probe.right - probe.left;
  const mark = markAt(kind, 0, 0, 64);
  const mx = (W - mark.w) / 2;
  const m = markAt(kind, mx, 0, 64);
  const baseline = 64 + 16 - probe.top; // 16 units between mark and the tallest letter
  const text = textAt("wordmark", -probe.left, baseline, cap);
  return {
    vb: [0, 0, W, text.bottom],
    body: [path(m.d, mc), path(text.spans[0], cc), path(text.spans[1], vc)].join("\n"),
  };
}
for (const [suffix, c] of Object.entries(WAYS)) {
  const s = stacked(...c);
  save(`carevault-logo-stacked${suffix}.svg`, svgDoc(s.vb, s.body, "CareVault"));
}

// --- Wordmark only --------------------------------------------------------
for (const [suffix, [, cc, vc]] of Object.entries(WAYS)) {
  const probe = textAt("wordmark", 0, 0, 24);
  const t = textAt("wordmark", -probe.left, -probe.top, 24);
  save(`carevault-wordmark${suffix}.svg`,
    svgDoc([0, 0, t.right, t.bottom], [path(t.spans[0], cc), path(t.spans[1], vc)].join("\n"), "CareVault"));
}

// --- "Powered by CareVault" co-brand lockup ---------------------------------
for (const [suffix, [mc, cc, vc, kind], pc] of [["", WAYS[""], GREY], ["-reversed", WAYS["-reversed"], "#94A3B8"]]) {
  const capW = 12, capP = 9;
  const baseline = 14 + capW / 2;
  const p = textAt("powered", 0, baseline, capP);
  const mark = markAt(kind, p.right + 9, 4, 20);
  const w = textAt("wordmark", p.right + 9 + mark.w + 6, baseline, capW);
  const top = Math.min(4, w.top), bottom = Math.max(24, w.bottom);
  save(`carevault-powered-by${suffix}.svg`, svgDoc([0, top, w.right, bottom - top],
    [path(p.spans[0], pc), path(mark.d, mc), path(w.spans[0], cc), path(w.spans[1], vc)].join("\n"), "Powered by CareVault"));
}

// --- App icon and favicon SVGs --------------------------------------------
function tile(size, radius, markFrac, kind = "rev") {
  const m = MARKS[kind];
  const h = size * markFrac;
  const k = h / (m.y1 - m.y0);
  const w = (m.x1 - m.x0) * k;
  const mk = markAt(kind, (size - w) / 2, (size - h) / 2, h);
  const bg = radius > 0
    ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${BLUE}"/>`
    : `<rect width="${size}" height="${size}" fill="${BLUE}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${bg}${path(mk.d, "#FFFFFF")}</svg>`;
}
save("carevault-app-icon.svg", tile(512, 112, 0.56));
save("favicon.svg", svgDoc([5, 5, 54, 54], path(MARKS.full.d, BLUE), "CareVault"));

// --- Rasters --------------------------------------------------------------
const png = (svg, w, h, file) => sharp(Buffer.from(svg), { density: 72 * Math.max(1, (w || 0) / 64) })
  .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png().toFile(join(outDir, "png", file));

const favicons = {};
for (const px of [16, 32, 48]) {
  const file = `favicon-${px}.png`;
  await png(files["favicon.svg"], px, px, file);
  favicons[px] = readFileSync(join(outDir, "png", file));
}
// ICO container holding the three PNGs.
{
  const sizes = [16, 32, 48];
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((px, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(px, e); header.writeUInt8(px, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(favicons[px].length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += favicons[px].length;
  });
  writeFileSync(join(outDir, "png", "favicon.ico"), Buffer.concat([header, ...sizes.map((s) => favicons[s])]));
}

await png(tile(180, 0, 0.56), 180, 180, "apple-touch-icon.png");
await png(tile(512, 112, 0.56), 192, 192, "icon-192.png");
await png(tile(512, 112, 0.56), 512, 512, "icon-512.png");
await png(tile(512, 0, 0.44), 512, 512, "icon-512-maskable.png");
await png(tile(400, 0, 0.5), 400, 400, "social-avatar.png");

const hz = horizontal(...WAYS[""]);
await png(svgDoc(hz.vb, hz.body, "CareVault"), 1200, null, "carevault-logo-horizontal.png");
const hzr = horizontal(...WAYS["-reversed"]);
await png(svgDoc(hzr.vb, hzr.body, "CareVault"), 1200, null, "carevault-logo-horizontal-reversed.png");

// Link-preview image (Open Graph), 1200 × 630.
{
  const W = 1200, H = 630;
  const mark = markAt("full", 96, 150, 150);
  const cap = 68;
  const word = textAt("wordmark", 96 + mark.w + 38, 150 + 75 + cap / 2, cap);
  const tag = textAt("tagline", 96, 430, 30);
  const dom = textAt("domain", 96, 530, 20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
<rect y="${H - 16}" width="${W}" height="16" fill="${BLUE}"/>
${path(mark.d, BLUE)}${path(word.spans[0], INK)}${path(word.spans[1], BLUE)}
${path(tag.spans[0], "#475569")}${path(dom.spans[0], BLUE)}
</svg>`;
  save("og-image.svg", svg);
  await png(svg, W, H, "og-image.png");
}

console.log(Object.keys(files).length, "svgs");
