// Round 4 deliverables: the refined mark, its reversed drawing, W3 lockups and an app-icon tile.
import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { keyhole4 } from "./r4.mjs";
const req = createRequire("/Users/tiito/Desktop/development_gxd_app/package.json");
const { SVGPathData } = req("svg-pathdata");
const G = JSON.parse(readFileSync("glyphs.json", "utf8"));
const out = process.argv[2];
const place = (d, k, tx, ty) => new SVGPathData(d).scale(k, k).translate(tx, ty).round(100).encode();
const MARK = { n: 2.5, headN: 2, head: 14, w1: 5.5, w2: 18, jaw: 3.5, cusp: 2, dot: 5.5 };
// Light on dark reads heavier, so the counter opens slightly.
const REV = { ...MARK, head: 14.4, w1: 6.1, w2: 18.6, dot: 5.2 };
const m = keyhole4(MARK), r = keyhole4(REV);
const svg64 = (d, c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><path fill="${c}" d="${d}"/></svg>\n`;
writeFileSync(`${out}/mark.svg`, svg64(m, "#2563EB"));
writeFileSync(`${out}/mark-white.svg`, svg64(r, "#FFFFFF"));
writeFileSync(`${out}/mark-black.svg`, svg64(m, "#000000"));
const cap = 23, x0 = 65, base = 26 + cap / 2;
function lockup(markD, mc, wc) {
  const parts = [["care500", 0], ["vault700", G.care500.width - 3]];
  let body = `<path fill="${mc}" d="${place(markD, 1, -6, -6)}"/>`, right = 0;
  for (const [key, dx] of parts) {
    const t = G[key], s = cap / t.capHeight;
    body += `<path fill="${wc}" d="${place(t.spans[0], s, x0 + dx * s, base)}"/>`;
    right = Math.max(right, x0 + (dx + t.bounds[2]) * s);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${right.toFixed(2)} 52" width="${right.toFixed(2)}" height="52" role="img" aria-label="CareVault"><title>CareVault</title>${body}</svg>\n`;
}
writeFileSync(`${out}/lockup.svg`, lockup(m, "#2563EB", "#0F172A"));
writeFileSync(`${out}/lockup-reversed.svg`, lockup(r, "#FFFFFF", "#FFFFFF"));
writeFileSync(`${out}/lockup-black.svg`, lockup(m, "#000000", "#000000"));
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="112" fill="#2563EB"/><path fill="#FFFFFF" d="${place(r, 5.5, 256 - 5.5 * 31.6, 256 - 5.5 * 32)}"/></svg>\n`;
writeFileSync(`${out}/app-icon.svg`, tile);
console.log("ok");
