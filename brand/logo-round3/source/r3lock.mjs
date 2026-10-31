// Round 3 lockups for the two finalists. Usage: node r3lock.mjs glyphs.json outDir
import { createRequire } from "module";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { hubSystem, keyholeC2 } from "./r3.mjs";
const req = createRequire("/Users/tiito/Desktop/development_gxd_app/package.json");
const sharp = req("sharp");
const { SVGPathData } = req("svg-pathdata");
const [gf, out] = process.argv.slice(2);
const G = JSON.parse(readFileSync(gf, "utf8"));
mkdirSync(out, { recursive: true });
const place = (d, k, tx, ty) => new SVGPathData(d).scale(k, k).translate(tx, ty).round(100).encode();
const MARKS = {
  hub: hubSystem({ segments: 3 }),
  keyhole: keyholeC2({ Ro: 26, Ri: 13, w1: 5, w2: 16, k: 1.75, core: 5 }),
  keyholeRev: keyholeC2({ Ro: 26, Ri: 13.4, w1: 5.6, w2: 16.6, k: 1.75, core: 4.7 }),
};
const doc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h}" width="${w.toFixed(2)}" height="${h}" role="img" aria-label="CareVault"><title>CareVault</title>${body}</svg>\n`;
function lockup(markD, wordKey, [mc, cc, vc]) {
  const k = 52 / 52; // mark visual box 6..58 → 52 units tall
  const mark = place(markD, k, -6, -6);
  const t = G[wordKey], cap = 23, s = cap / t.capHeight, x = 52 + 13, base = 26 + cap / 2;
  const [care, vault] = t.spans.map((d) => place(d, s, x, base));
  const w = x + t.bounds[2] * s;
  return doc(w, 52, `<path fill="${mc}" d="${mark}"/><path fill="${cc}" d="${care}"/><path fill="${vc}" d="${vault}"/>`);
}
const LIGHT = ["#2563EB", "#0F172A", "#2563EB"], DARK = ["#FFFFFF", "#FFFFFF", "#60A5FA"];
const files = {};
const save = (n, s) => { files[n] = s; writeFileSync(join(out, n), s); };
for (const [name, d] of Object.entries(MARKS)) save(`mark-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><path fill="#2563EB" d="${d}"/></svg>\n`);
save("mark-hub-white.svg", files["mark-hub.svg"].replace("#2563EB", "#FFFFFF"));
save("mark-keyhole-white.svg", files["mark-keyholeRev.svg"].replace("#2563EB", "#FFFFFF"));
for (const w of ["wordmark", "wordmark600"]) {
  const tag = w === "wordmark" ? "700" : "600";
  save(`lockup-hub-${tag}.svg`, lockup(MARKS.hub, w, LIGHT));
  save(`lockup-keyhole-${tag}.svg`, lockup(MARKS.keyhole, w, LIGHT));
  save(`lockup-hub-${tag}-reversed.svg`, lockup(MARKS.hub, w, DARK));
  save(`lockup-keyhole-${tag}-reversed.svg`, lockup(MARKS.keyholeRev, w, DARK));
}
// proof sheet
const r = (n, width, bg) => sharp(Buffer.from(files[n]), { density: 400 }).resize(width).flatten({ background: bg }).png().toBuffer();
const comps = []; let y = 10;
for (const m of ["hub", "keyhole"]) {
  comps.push({ input: await r(`lockup-${m}-700.svg`, 420, "#fff"), left: 10, top: y });
  comps.push({ input: await r(`lockup-${m}-600.svg`, 420, "#fff"), left: 450, top: y });
  comps.push({ input: await r(`lockup-${m}-600-reversed.svg`, 420, "#020617"), left: 890, top: y });
  y += 120;
}
await sharp({ create: { width: 1320, height: y, channels: 3, background: "#e2e8f0" } }).composite(comps).png().toFile(join(out, "_proof.png"));
