import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { keyhole4 } from "./r4.mjs";
const req = createRequire("/Users/tiito/Desktop/development_gxd_app/package.json");
const sharp = req("sharp"); const { SVGPathData } = req("svg-pathdata");
const G = JSON.parse(readFileSync("glyphs.json", "utf8"));
const place = (d, k, tx, ty) => new SVGPathData(d).scale(k, k).translate(tx, ty).round(100).encode();
export const R3 = { n: 2.5, headN: 2, head: 14, w1: 5.5, w2: 18, jaw: 3.5, cusp: 2, dot: 5.5 };
const mark = place(keyhole4(R3), 1, -6, -6);
const cap = 23, x0 = 52 + 13, base = 26 + cap / 2;
function words(parts) { // parts: [[key, colour, xOffset]]
  let body = "", right = 0;
  for (const [key, col, dx, spanIdx] of parts) {
    const t = G[key], s = cap / t.capHeight;
    const spans = spanIdx === undefined ? t.spans : [t.spans[spanIdx]];
    for (const sp of spans) body += `<path fill="${col}" d="${place(sp, s, x0 + dx * s, base)}"/>`;
    right = Math.max(right, x0 + (dx + t.bounds[2]) * s);
  }
  return { body, right };
}
const T = {
  W1: words([["wordmark", "#0F172A", 0, 0], ["wordmark", "#2563EB", 0, 1]]),
  W2: words([["wm700t", "#0F172A", 0]]),
  W3: words([["care500", "#0F172A", 0], ["vault700", "#0F172A", G.care500.width - 3]]),
  W4: words([["wm600t", "#0F172A", 0]]),
};
const out = {};
for (const [k, w] of Object.entries(T)) {
  out[k] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.right.toFixed(2)} 52" width="${w.right.toFixed(2)}" height="52"><path fill="#2563EB" d="${mark}"/>${w.body}</svg>`;
  writeFileSync(`${process.argv[2]}/r4-lockup-${k}.svg`, out[k]);
}
const comps = []; let y = 10;
for (const k of Object.keys(out)) { comps.push({ input: await sharp(Buffer.from(out[k]), { density: 400 }).resize(null, 90).flatten({ background: "#fff" }).png().toBuffer(), left: 10, top: y }); y += 110; }
await sharp({ create: { width: 520, height: y, channels: 3, background: "#e2e8f0" } }).composite(comps).png().toFile(`${process.argv[2]}/r4-words.png`);
