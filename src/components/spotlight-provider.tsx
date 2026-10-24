"use client";

import { useEffect } from "react";

/**
 * Faz a "luz que segue o mouse" dos cards: um único ouvinte global atualiza --mx/--my do card sob o
 * cursor (qualquer elemento com .nex-card, .nex-spot ou .nex-frame). Sem componente por card.
 */
export function SpotlightProvider() {
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(".nex-card, .nex-spot, .nex-frame") as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
