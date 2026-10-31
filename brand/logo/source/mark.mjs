// Geometry for the refined CareVault hub mark, on a 64-unit grid.
// Exports path data for the full mark (4 segments) and the small-size mark (one solid C).

const C = 32;
const rad = (d) => (d * Math.PI) / 180;
const f = (n) => Number(n.toFixed(3));
const pt = (r, deg) => [f(C + r * Math.cos(rad(deg))), f(C + r * Math.sin(rad(deg)))];

function circle(cx, cy, r) {
  return `M${f(cx - r)} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

// A ring segment between angles s and e (clockwise, screen coords). Each end is either a
// round cap ("cap") or a parallel-sided cut leaving half of `gap` on this side ("cut").
function segment({ s, e, sEnd, eEnd, Ro, Ri, gap }) {
  const h = (Ro - Ri) / 2;
  const off = (r, end) => (end === "cut" ? (Math.asin(gap / 2 / r) * 180) / Math.PI : 0);
  const oS = pt(Ro, s + off(Ro, sEnd));
  const oE = pt(Ro, e - off(Ro, eEnd));
  const iE = pt(Ri, e - off(Ri, eEnd));
  const iS = pt(Ri, s + off(Ri, sEnd));
  const large = e - s > 180 ? 1 : 0;
  let d = `M${oS} A${Ro} ${Ro} 0 ${large} 1 ${oE} `;
  d += eEnd === "cap" ? `A${h} ${h} 0 0 1 ${iE} ` : `L${iE} `;
  d += `A${Ri} ${Ri} 0 ${large} 0 ${iS} `;
  d += sEnd === "cap" ? `A${h} ${h} 0 0 1 ${oS} Z` : `Z`;
  return d.replace(/,/g, " ");
}

function spoke(x0, x1, w) {
  // Counter-clockwise, like the circles, so overlaps fill instead of cancelling.
  return `M${x0} ${C - w / 2} V${C + w / 2} H${x1} V${C - w / 2} Z`;
}

// Full mark: the ring opens 80° on the right; three cuts split it into four departments.
export function fullMark() {
  const Ro = 26, Ri = 18, gap = 4;
  const cuts = [40, 110, 180, 250, 320];
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(segment({
      s: cuts[i], e: cuts[i + 1],
      sEnd: i === 0 ? "cap" : "cut",
      eEnd: i === 3 ? "cap" : "cut",
      Ro, Ri, gap,
    }));
  }
  parts.push(circle(32, 32, 7.5));
  parts.push(spoke(32, 51, 4));
  parts.push(circle(53, 32, 4.5));
  return parts.join(" ");
}

// Small mark (24 px and below): no cuts, heavier ring, spoke and nodes so it holds at 16 px.
export function smallMark() {
  const parts = [
    segment({ s: 40, e: 320, sEnd: "cap", eEnd: "cap", Ro: 26.5, Ri: 16.5, gap: 0 }),
    circle(32, 32, 8.5),
    spoke(32, 50, 6),
    circle(52.5, 32, 5.5),
  ];
  return parts.join(" ");
}
