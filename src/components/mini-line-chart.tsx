// Biểu đồ đường đơn giản bằng SVG (không cần thư viện), render server-side.
export default function MiniLineChart({ points, height = 140 }: { points: { label: string; value: number }[]; height?: number }) {
  if (!points.length) return null;
  const W = 720, H = height, pad = 30;
  const vals = points.map((p) => p.value);
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const zeroY = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }} role="img" aria-label="Biểu đồ số dư theo tháng">
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#D8E0D4" strokeWidth="1" />
      <path d={d} fill="none" stroke="#2E5D45" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="3" fill="#A87B2E" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#637067" fontFamily="monospace">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
