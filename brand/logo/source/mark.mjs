// Geometry for the CareVault "Keyhole C" mark, on a 64-unit grid centred at (32, 32).
// A heavy C whose counter is a keyhole: a round head at the centre holding the record dot,
// and a slot that widens out through the mouth. One drawing works at every size.

const C = 32;
const f = (n) => Number(n.toFixed(3));
const P = (x, y) => `${f(x)} ${f(y)}`;

function circle(cx, cy, r) {
  return `M${f(cx - r)} ${f(cy)} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

// Where the line y = y0 + m (x - x0) meets the circle of radius rho, taking the right-hand root.
function lineCircle(x0, y0, m, rho) {
  const a = 1 + m * m;
  const k = y0 - m * x0 - C;
  const b = -2 * C + 2 * m * k;
  const c = C * C + k * k - rho * rho;
  const x = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return [x, y0 + m * (x - x0)];
}

// Ro: outer radius. Ri: keyhole-head radius. w1/w2: slot width at the head and at the rim.
// k: fillet radius at the four jaw corners. core: radius of the record dot.
function keyholeC({ Ro, Ri, w1, w2, k, core }) {
  const m = (w2 - w1) / 2 / Ro;
  const jaws = {
    top: { x0: C, y0: C - w1 / 2, m: -m, side: -1 },
    bottom: { x0: C, y0: C + w1 / 2, m, side: +1 },
  };
  // Fillet between a jaw line and a circle: returns the tangent points on each.
  function corner(jaw, rho, outer) {
    const { x0, y0, m: s, side } = jaws[jaw];
    const n = Math.sqrt(1 + s * s);
    const fc = lineCircle(x0, y0 + side * k * n, s, outer ? rho - k : rho + k);
    const r = Math.hypot(fc[0] - C, fc[1] - C);
    const onCircle = [C + ((fc[0] - C) * rho) / r, C + ((fc[1] - C) * rho) / r];
    const t = ((fc[0] - x0) + (fc[1] - y0) * s) / n;
    const onLine = [x0 + t / n, y0 + (t * s) / n];
    return { onCircle, onLine };
  }
  const bo = corner("bottom", Ro, true), to = corner("top", Ro, true);
  const ti = corner("top", Ri, false), bi = corner("bottom", Ri, false);
  let d = `M${P(...bo.onCircle)} A${Ro} ${Ro} 0 1 1 ${P(...to.onCircle)}`;
  d += ` A${k} ${k} 0 0 1 ${P(...to.onLine)} L${P(...ti.onLine)} A${k} ${k} 0 0 1 ${P(...ti.onCircle)}`;
  d += ` A${Ri} ${Ri} 0 1 0 ${P(...bi.onCircle)} A${k} ${k} 0 0 1 ${P(...bi.onLine)} L${P(...bo.onLine)}`;
  d += ` A${k} ${k} 0 0 1 ${P(...bo.onCircle)} Z`;
  return `${d} ${circle(C, C, core)}`;
}

// Head radius is half the outer radius; the record dot is the head divided by φ².
export const fullMark = () => keyholeC({ Ro: 26, Ri: 13, w1: 5, w2: 16, k: 1.75, core: 5 });

// Light-on-dark artwork looks heavier (irradiation), so the counter opens slightly.
export const reversedMark = () => keyholeC({ Ro: 26, Ri: 13.4, w1: 5.6, w2: 16.6, k: 1.75, core: 4.7 });
