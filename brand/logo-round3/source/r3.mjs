// Round 3 geometry: refined Hub variants on a 64-unit grid, centre (32, 32).
const C = 32;
const f = (n) => Number(n.toFixed(3));
const P = (x, y) => `${f(x)} ${f(y)}`;
const polar = (r, deg) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)];
const angOf = ([x, y]) => (Math.atan2(y - C, x - C) * 180) / Math.PI;

export function circle(cx, cy, r) {
  return `M${f(cx - r)} ${f(cy)} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

// Where the line y = y0 + m (x - x0) meets the circle of radius rho, taking the root on the right.
function lineCircle(x0, y0, m, rho) {
  // (x-C)^2 + (y0 + m(x-x0) - C)^2 = rho^2
  const a = 1 + m * m;
  const k = y0 - m * x0 - C;
  const b = -2 * C + 2 * m * k;
  const c = C * C + k * k - rho * rho;
  const x = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return [x, y0 + m * (x - x0)];
}

// Edge descriptors: each returns the outer and inner point of a segment end.
// cut(θ, g, side): parallel-sided radial gap of width 2g centred on θ; side +1 = segment after the cut.
const cutEdge = (theta, g, side) => (rho) => polar(rho, theta + side * (Math.asin(g / rho) * 180) / Math.PI);
// line edge: a straight line through (x0, y0) with slope m (the jaw of the C).
const lineEdge = (x0, y0, m) => (rho) => lineCircle(x0, y0, m, rho);

// Ring segment from edge s to edge e (clockwise), between radii Ri and Ro.
function seg(s, e, Ro, Ri) {
  const oS = s(Ro), oE = e(Ro), iE = e(Ri), iS = s(Ri);
  let sweep = angOf(oE) - angOf(oS);
  if (sweep < 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;
  let sweepI = angOf(iE) - angOf(iS);
  if (sweepI < 0) sweepI += 360;
  const largeI = sweepI > 180 ? 1 : 0;
  return `M${P(...oS)} A${Ro} ${Ro} 0 ${large} 1 ${P(...oE)} L${P(...iE)} A${Ri} ${Ri} 0 ${largeI} 0 ${P(...iS)} Z`;
}

// A C ring opening to the right, jaws along two lines, optionally split by compass-aligned cuts.
function cRing({ Ro, Ri, top, bottom, cuts = [], g = 1 }) {
  const edges = [lineEdge(...bottom)];
  for (const t of cuts) edges.push(cutEdge(t, g, -1), cutEdge(t, g, +1));
  edges.push(lineEdge(...top));
  const parts = [];
  for (let i = 0; i < edges.length; i += 2) parts.push(seg(edges[i], edges[i + 1], Ro, Ri));
  return parts.join(" ");
}

// R3-A "Keyhole C": a heavy C whose counter is a keyhole: round head at the centre, a slot
// widening out through the mouth. Optional compass cuts for the four departments, optional core.
export function keyholeC({ cuts = false, core = false } = {}) {
  const Ro = 26, Ri = 10;          // ring 16 thick; head diameter 20
  const w1 = 7, w2 = 14;           // slot half-widths: at the head 3.5, at the rim 7
  const m = (w2 / 2 - w1 / 2) / (C + Ro - C);
  const top = [C, C - w1 / 2, -m];
  const bottom = [C, C + w1 / 2, m];
  let d = cRing({ Ro, Ri, top, bottom, cuts: cuts ? [90, 180, 270] : [], g: 1.25 });
  if (core) d += " " + circle(C, C, 4.5);
  return d;
}

// R3-B "Key Hub": the approved Hub on one unit (u = 4). Ring 2u thick with flat, parallel jaws;
// three compass cuts of 1u; the record (core, 2u radius) becomes the bow of a key whose blade
// (1u) leaves through the mouth and ends in a bit.
export function keyHub({ cuts = true } = {}) {
  const u = 4;
  const Ro = 26, Ri = Ro - 2 * u;
  const h = 3.25 * u; // jaw half-height
  let d = cRing({ Ro, Ri, top: [C, C - h, 0], bottom: [C, C + h, 0], cuts: cuts ? [90, 180, 270] : [], g: u / 2 });
  d += " " + circle(C, C, 2 * u);
  // blade + bit, drawn counter-clockwise like the circle so overlaps fill
  const x0 = C, x1 = C + Ro, y0 = C - u / 2, y1 = C + u / 2;
  d += ` M${P(x0, y0)} V${f(y1)} H${f(x1 - 1.75 * u)} V${f(y1 + 1.25 * u)} H${f(x1)} V${f(y0)} Z`;
  return d;
}

// R3-A refined: one continuous C whose counter is a keyhole, with filleted jaw corners.
// Ro/Ri: outer radius and keyhole-head radius; w1/w2: slot width at the head and at the rim;
// k: fillet radius at the four jaw corners; core: radius of the record dot (0 = none).
export function keyholeC2({ Ro = 26, Ri = 11, w1 = 6, w2 = 16, k = 1.5, core = 5 } = {}) {
  const m = (w2 - w1) / 2 / Ro;
  const norm = Math.sqrt(1 + m * m);
  const dir = [1 / norm, m / norm];
  // jaw lines as (x0, y0, slope); top slopes up (-m), bottom down (+m)
  const jaws = {
    top: { x0: C, y0: C - w1 / 2, m: -m, side: -1 },
    bottom: { x0: C, y0: C + w1 / 2, m, side: +1 },
  };
  function corner(jaw, rho, outer) {
    const { x0, y0, m: s, side } = jaws[jaw];
    const n = Math.sqrt(1 + s * s);
    const fc = lineCircle(x0, y0 + side * k * n, s, outer ? rho - k : rho + k);
    const r = Math.hypot(fc[0] - C, fc[1] - C);
    const onCircle = [C + ((fc[0] - C) * rho) / r, C + ((fc[1] - C) * rho) / r];
    const d = [1 / n, s / n];
    const t = (fc[0] - x0) * d[0] + (fc[1] - y0) * d[1];
    const onLine = [x0 + t * d[0], y0 + t * d[1]];
    return { onCircle, onLine };
  }
  void dir;
  const bo = corner("bottom", Ro, true), to = corner("top", Ro, true);
  const ti = corner("top", Ri, false), bi = corner("bottom", Ri, false);
  let d = `M${P(...bo.onCircle)} A${Ro} ${Ro} 0 1 1 ${P(...to.onCircle)}`;
  d += ` A${k} ${k} 0 0 1 ${P(...to.onLine)} L${P(...ti.onLine)} A${k} ${k} 0 0 1 ${P(...ti.onCircle)}`;
  d += ` A${Ri} ${Ri} 0 1 0 ${P(...bi.onCircle)} A${k} ${k} 0 0 1 ${P(...bi.onLine)} L${P(...bo.onLine)}`;
  d += ` A${k} ${k} 0 0 1 ${P(...bo.onCircle)} Z`;
  if (core) d += " " + circle(C, C, core);
  return d;
}

// Round-capped ring segment between angles s and e on mid-radius Rm with thickness t.
function arcSeg(s, e, Rm, t, sEnd, eEnd, g) {
  const Ro = Rm + t / 2, Ri = Rm - t / 2, h = t / 2;
  const off = (r, end) => (end === "cut" ? (Math.asin(g / 2 / r) * 180) / Math.PI : 0);
  const oS = polar(Ro, s + off(Ro, sEnd)), oE = polar(Ro, e - off(Ro, eEnd));
  const iE = polar(Ri, e - off(Ri, eEnd)), iS = polar(Ri, s + off(Ri, sEnd));
  const large = e - s > 180 ? 1 : 0;
  let d = `M${P(...oS)} A${Ro} ${Ro} 0 ${large} 1 ${P(...oE)} `;
  d += eEnd === "cap" ? `A${h} ${h} 0 0 1 ${P(...iE)} ` : `L${P(...iE)} `;
  d += `A${Ri} ${Ri} 0 ${large} 0 ${P(...iS)} `;
  d += sEnd === "cap" ? `A${h} ${h} 0 0 1 ${P(...oS)} Z` : "Z";
  return d;
}

// R3-B "Hub, systemised": every part from one module t (ring thickness).
// Ring t on mid-radius Rm; round caps and the connection node are all circles of diameter t on
// that same mid-radius, so the node reads as the ring's missing piece. Core 2t, spoke t/2, gaps t/2.
export function hubSystem({ t = 8, mouth = 45, segments = 4, centre = "dot" } = {}) {
  const Rm = 26 - t / 2;
  const span = 360 - 2 * mouth;
  const parts = [];
  for (let i = 0; i < segments; i++) {
    const s = mouth + (span * i) / segments, e = mouth + (span * (i + 1)) / segments;
    parts.push(arcSeg(s, e, Rm, t, i === 0 ? "cap" : "cut", i === segments - 1 ? "cap" : "cut", t / 2));
  }
  const nx = C + Rm;
  if (centre === "dot") {
    parts.push(circle(C, C, t));
    parts.push(`M${P(C, C - t / 4)} V${f(C + t / 4)} H${f(nx)} V${f(C - t / 4)} Z`);
  } else {
    // positive keyhole: the record (head) with a slot widening out to the node
    const a = t / 4, b = t / 2;
    parts.push(circle(C, C, t * 0.9));
    parts.push(`M${P(C, C - a)} V${f(C + a)} L${P(nx, C + b)} V${f(C - b)} Z`);
  }
  parts.push(circle(nx, C, t / 2));
  return parts.join(" ");
}
