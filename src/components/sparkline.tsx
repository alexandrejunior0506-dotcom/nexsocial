import { useId } from "react";

/** Mini-gráfico de área/linha que se desenha sozinho ao aparecer (uso: publicações dos últimos dias). */
export function Sparkline({
  values,
  width = 132,
  height = 36,
  color = "var(--accent-from)",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const id = useId().replace(/:/g, "");
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => [i * step, height - 4 - (v / max) * (height - 10)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="nex-spark-area" d={area} fill={`url(#spark-${id})`} />
      <path
        className="nex-spark-line"
        d={line}
        pathLength={400}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      {last && <circle className="nex-spark-area" cx={last[0]} cy={last[1]} r="2.6" fill="#fff" />}
    </svg>
  );
}
