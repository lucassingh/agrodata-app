import type { KeyboardEvent } from "react";

/**
 * Navegación con flechas para un tablist (patrón WAI-ARIA): mueve la selección
 * y el foco al tab siguiente/anterior. `tabDomId` arma el id del botón de cada tab.
 */
export function useTabKeys<T extends string>({
  ids,
  activeId,
  onChange,
  tabDomId,
  orientation = "horizontal",
}: {
  ids: readonly T[];
  activeId: T;
  onChange: (id: T) => void;
  tabDomId: (id: T) => string;
  orientation?: "horizontal" | "vertical";
}) {
  const [prevKey, nextKey] = orientation === "horizontal" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];

  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== prevKey && event.key !== nextKey) return;
    event.preventDefault();
    const index = ids.indexOf(activeId);
    const step = event.key === nextKey ? 1 : -1;
    const next = ids[(index + step + ids.length) % ids.length]!;
    onChange(next);
    document.getElementById(tabDomId(next))?.focus();
  };
}
