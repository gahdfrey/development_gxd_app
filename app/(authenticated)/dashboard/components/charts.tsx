import { ReactNode } from "react";

// Solid, professional palette (no gradients).
export const PALETTE = [
  "#2563eb", "#059669", "#d97706", "#7c3aed",
  "#e11d48", "#0891b2", "#4f46e5", "#64748b",
];

export interface Slice {
  label: string;
  value: number;
  code?: string | null;
}

// ── Card wrapper ───────────────────────────────────────────────────────────

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center py-10 text-center">
      <p className="text-sm text-gray-400">{children}</p>
    </div>
  );
}

// ── Donut chart ────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  colors = PALETTE,
  size = 168,
  thickness = 24,
}: {
  data: Slice[];
  colors?: string[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <Empty>No data yet</Empty>;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  // Precompute segment lengths and cumulative offsets purely (no mutation
  // during render — the React compiler forbids reassignment).
  const lens = data.map((d) => (d.value / total) * c);
  const segments = data.map((d, i) => ({
    len: lens[i],
    offset: lens.slice(0, i).reduce((a, b) => a + b, 0),
    color: colors[i % colors.length],
  }));

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.len} ${c - s.len}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text x="50%" y="48%" textAnchor="middle" className="fill-gray-900 font-bold" style={{ fontSize: size * 0.2 }}>
          {total.toLocaleString()}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-gray-400" style={{ fontSize: size * 0.075 }}>
          total
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="truncate text-gray-600 capitalize">{d.label}</span>
            <span className="ml-auto font-semibold text-gray-900">{d.value.toLocaleString()}</span>
            <span className="w-9 text-right text-xs text-gray-400">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Multi-series area/line chart ───────────────────────────────────────────

export function AreaChart({
  labels,
  series,
}: {
  labels: string[];
  series: { name: string; color: string; points: number[] }[];
}) {
  const W = 560, H = 220, padL = 10, padR = 10, padT = 14, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxV = Math.max(1, ...series.flatMap((s) => s.points));
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / maxV) * innerH;

  const gridY = [0, 0.5, 1].map((f) => padT + innerH - f * innerH);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {gridY.map((gy, i) => (
          <line key={i} x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {series.map((s) => {
          const line = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p)}`).join(" ");
          const area = `${line} L ${x(n - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`;
          return (
            <g key={s.name}>
              <path d={area} fill={s.color} opacity={0.08} />
              <path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {s.points.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p)} r={3} fill="#fff" stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 11 }}>
            {l}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Vertical bar chart ─────────────────────────────────────────────────────

export function BarChart({
  data,
  color = "#2563eb",
  formatValue,
}: {
  data: Slice[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  if (data.every((d) => d.value === 0)) return <Empty>No data yet</Empty>;
  const W = 560, H = 220, padL = 10, padR = 10, padT = 22, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const slot = innerW / data.length;
  const barW = Math.min(46, slot * 0.55);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="#e2e8f0" strokeWidth={1} />
      {data.map((d, i) => {
        const h = (d.value / maxV) * innerH;
        const cx = padL + (i + 0.5) * slot;
        const bx = cx - barW / 2;
        const by = padT + innerH - h;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={h} rx={4} fill={color} />
            <text x={cx} y={by - 6} textAnchor="middle" className="fill-gray-700 font-semibold" style={{ fontSize: 10 }}>
              {formatValue ? formatValue(d.value) : d.value}
            </text>
            <text x={cx} y={H - 8} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 11 }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Horizontal bar list (top-N) ────────────────────────────────────────────

export function HBarList({
  data,
  color = "#2563eb",
  formatValue,
  emptyText = "No data yet",
}: {
  data: Slice[];
  color?: string;
  formatValue?: (v: number) => string;
  emptyText?: string;
}) {
  if (!data.length) return <Empty>{emptyText}</Empty>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={i}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-gray-700">
              {d.code && (
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                  {d.code}
                </span>
              )}
              <span className="truncate">{d.label ?? "—"}</span>
            </span>
            <span className="shrink-0 font-semibold text-gray-900">
              {formatValue ? formatValue(d.value) : d.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
