import type { CSSProperties } from "react";

// Posições fixas (não aleatórias) para o servidor e o navegador renderizarem o mesmo HTML.
const STARS: [number, number, number, number][] = [
  [6, 12, 4.2, 0.2], [14, 62, 5.1, 1.4], [21, 28, 3.6, 2.2], [29, 82, 6.2, 0.7], [37, 18, 4.8, 3.1],
  [44, 47, 5.5, 1.9], [52, 9, 3.9, 0.4], [58, 71, 6.6, 2.7], [63, 34, 4.4, 1.1], [71, 88, 5.8, 3.4],
  [77, 21, 3.7, 0.9], [83, 56, 5.2, 2.0], [89, 13, 4.6, 1.6], [93, 74, 6.0, 0.3], [97, 40, 4.1, 2.5],
  [10, 91, 5.4, 1.2], [26, 52, 3.8, 3.0], [48, 93, 6.4, 0.6], [67, 6, 4.0, 2.3], [86, 94, 5.0, 1.8],
];

/** Fundo vivo: aurora azul à deriva, grade sutil e estrelas piscando. Fica fixo atrás de tudo. */
export function Atmosphere() {
  return (
    <div className="nex-atmos" aria-hidden>
      <div className="nex-aurora a1" />
      <div className="nex-aurora a2" />
      <div className="nex-aurora a3" />
      <div className="nex-grid" />
      <div className="nex-stars">
        {STARS.map(([x, y, d, delay], i) => (
          <i key={i} style={{ left: `${x}%`, top: `${y}%`, "--d": `${d}s`, "--delay": `${delay}s` } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
