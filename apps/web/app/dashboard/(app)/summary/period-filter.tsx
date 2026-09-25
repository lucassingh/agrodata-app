"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

interface PeriodFilterProps {
  from: string;
  to: string;
}

/** Hoy en Argentina como YYYY-MM-DD (lo que espera un `<input type="date">`). */
function todayInArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function presets(): { id: string; label: string; from: string; to: string }[] {
  const today = todayInArgentina();
  return [
    { id: "all", label: "Todo", from: "", to: "" },
    { id: "month", label: "Este mes", from: `${today.slice(0, 7)}-01`, to: today },
    { id: "30d", label: "Últimos 30 días", from: shiftDays(today, -29), to: today },
    { id: "year", label: "Este año", from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
}

/** Período del Resumen, en la URL (`?from=&to=`). Filtra lo que ocurre en el
 *  tiempo (registros, ventas, compras, mortandad, gastos); el estado actual
 *  (animales, potreros, stock) no depende del período. */
export function PeriodFilter({ from, to }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const push = (next: { from: string; to: string }) => {
    const params = new URLSearchParams();
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const options = presets();
  const active = options.find((option) => option.from === from && option.to === to)?.id;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <CalendarRange size={16} className="text-primary" aria-hidden />
        Período
      </span>
      <div role="group" aria-label="Períodos rápidos" className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={active === option.id}
            onClick={() => push(option)}
            className={cn(
              "h-8 rounded-lg px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active === option.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        <label htmlFor="summary-from" className="text-xs text-muted-foreground">
          Desde
        </label>
        <input
          id="summary-from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => push({ from: e.target.value, to })}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        />
        <label htmlFor="summary-to" className="text-xs text-muted-foreground">
          Hasta
        </label>
        <input
          id="summary-to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => push({ from, to: e.target.value })}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        />
      </div>
    </div>
  );
}
