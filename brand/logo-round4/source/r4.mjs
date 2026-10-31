// Round 4: Keyhole C on a superellipse, with smooth rounded junctions. 64-unit grid, centre (32, 32).
// The outline is built as runs (sampled curves and straight lines), corners are rounded by trimming
// a distance along both runs and bridging with a cubic, and curves are emitted as Catmull-Rom cubics.
const C = 32;
const f = (n) => Number(n.toFixed(2));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => mul(a, 1 / len(a));

const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
// Superellipse point for parameter t (clockwise on screen). n = 2 is a circle.
const superPt = (r, n, t) => [C + r * sp(Math.cos(t), 2 / n), C + r * sp(Math.sin(t), 2 / n)];

function bisect(g, lo, hi) {
  let glo = g(lo);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2, gm = g(mid);
    if (Math.sign(gm) === Math.sign(glo)) { lo = mid; glo = gm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

function sample(fn, t0, t1, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(fn(t0 + ((t1 - t0) * i) / steps));
  return pts;
}

// Trim distance d from the start (or end) of a polyline; returns the new polyline.
function trimStart(pts, d) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = len(sub(pts[i], pts[i - 1]));
    if (acc + seg >= d) {
      const p = add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), (d - acc) / seg));
      return [p, ...pts.slice(i)];
    }
    acc += seg;
  }
  throw new Error("trim longer than run");
}
const trimEnd = (pts, d) => trimStart([...pts].reverse(), d).reverse();

const startTangent = (pts) => unit(sub(pts[1], pts[0]));
const endTangent = (pts) => unit(sub(pts[pts.length - 1], pts[pts.length - 2]));

// Emit a sampled curve as Catmull-Rom cubics (assumes the pen is already at pts[0]).
function curveCmds(pts) {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// A closed outline from runs; corners[i] is the rounding distance between run i and run i+1.
function closedPath(runs, corners) {
  const trimmed = runs.map((r) => r.pts);
  for (let i = 0; i < runs.length; i++) {
    const j = (i + 1) % runs.length, k = corners[i];
    if (!k) continue;
    trimmed[i] = trimEnd(trimmed[i], k);
    trimmed[j] = trimStart(trimmed[j], k);
  }
  let d = `M${f(trimmed[0][0][0])} ${f(trimmed[0][0][1])}`;
  for (let i = 0; i < runs.length; i++) {
    const pts = trimmed[i];
    d += runs[i].line ? ` L${f(pts[pts.length - 1][0])} ${f(pts[pts.length - 1][1])}` : curveCmds(pts);
    const j = (i + 1) % runs.length, k = corners[i];
    const a = pts[pts.length - 1], b = trimmed[j][0];
    if (k) {
      // Bridge with a cubic whose handles follow each run's tangent (0.55 ≈ circular for 90°).
      const h = len(sub(b, a)) * 0.55;
      const c1 = add(a, mul(endTangent(pts), h));
      const c2 = sub(b, mul(startTangent(trimmed[j]), h));
      d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(b[0])} ${f(b[1])}`;
    } else if (j !== 0) d += ` L${f(b[0])} ${f(b[1])}`;
  }
  return d + " Z";
}

function circlePath(cx, cy, r) {
  return `M${f(cx - r)} ${f(cy)} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

// R: outer half-size; n: outer superellipse exponent (2 = circle). head: keyhole-head radius;
// headN: its exponent. w1/w2: slot width at the head and at the rim. jaw/cusp: rounding distances
// at the outer jaw corners and where the slot meets the head. dot: record-dot radius.
export function keyhole4({ R = 26, n = 2, head = 13, headN = 2, w1 = 5, w2 = 16, jaw = 1.75, cusp = 0, dot = 5 } = {}) {
  const m = (w2 - w1) / 2 / R;
  const bottomY = (x) => C + w1 / 2 + m * (x - C);
  // Outer contour meets the slot lines.
  const tb = bisect((t) => superPt(R, n, t)[1] - bottomY(superPt(R, n, t)[0]), 0, Math.PI / 2);
  const outer = sample((t) => superPt(R, n, t), tb, 2 * Math.PI - tb, 72);
  // Head contour meets the slot lines (head traversed counter-clockwise, around the left).
  const hb = bisect((t) => superPt(head, headN, t)[1] - bottomY(superPt(head, headN, t)[0]), 0, Math.PI / 2);
  const inner = sample((t) => superPt(head, headN, t), -hb, -2 * Math.PI + hb, 60);
  const topLine = { line: true, pts: [outer[outer.length - 1], inner[0]] };
  const bottomLine = { line: true, pts: [inner[inner.length - 1], outer[0]] };
  const d = closedPath(
    [{ pts: outer }, topLine, { pts: inner }, bottomLine],
    [jaw, cusp, cusp, jaw],
  );
  return dot ? `${d} ${circlePath(C, C, dot)}` : d;
}
