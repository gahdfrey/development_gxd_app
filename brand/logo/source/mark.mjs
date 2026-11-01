// Geometry for the CareVault "Hub II" mark, on a 64-unit grid centred at (32, 32).
// Every part comes from one module t (the ring thickness): a C ring of three mirrored segments,
// the record (core, 2t) at the centre, and a spoke (t/2) out through the opening to a node (t)
// that sits on the ring's centre line, so it reads as the ring's missing piece.

const C = 32;
const f = (n) => Number(n.toFixed(3));
const P = (x, y) => `${f(x)} ${f(y)}`;
const polar = (r, deg) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)];

function circle(cx, cy, r) {
  return `M${f(cx - r)} ${f(cy)} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

// Ring segment between angles s and e (clockwise) on mid-radius Rm with thickness t. Each end is a
// round cap ("cap") or a parallel-sided cut leaving half of gap g on this side ("cut").
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

// t: module (ring thickness); mouth: half-angle of the opening; segments: ring segments.
function hub({ t, mouth = 45, segments }) {
  const Rm = 26 - t / 2;
  const span = 360 - 2 * mouth;
  const parts = [];
  for (let i = 0; i < segments; i++) {
    const s = mouth + (span * i) / segments, e = mouth + (span * (i + 1)) / segments;
    parts.push(arcSeg(s, e, Rm, t, i === 0 ? "cap" : "cut", i === segments - 1 ? "cap" : "cut", t / 2));
  }
  const nx = C + Rm;
  parts.push(circle(C, C, t));
  // Spoke drawn counter-clockwise, like the circles, so overlaps fill instead of cancelling.
  parts.push(`M${P(C, C - t / 4)} V${f(C + t / 4)} H${f(nx)} V${f(C - t / 4)} Z`);
  parts.push(circle(nx, C, t / 2));
  return parts.join(" ");
}

export const fullMark = () => hub({ t: 8, segments: 3 });

// Light-on-dark artwork looks heavier (irradiation), so the reversed drawing is slightly lighter.
export const reversedMark = () => hub({ t: 7.6, segments: 3 });

// Under 24 px the segment gaps blur, so small sizes use one unbroken, heavier ring.
export const smallMark = () => hub({ t: 9, segments: 1 });
export const smallReversedMark = () => hub({ t: 8.6, segments: 1 });
