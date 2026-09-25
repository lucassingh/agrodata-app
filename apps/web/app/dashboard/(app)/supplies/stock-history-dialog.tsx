"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listStockMovementsAction, type StockMovementRow } from "./actions";
import { formatQuantity } from "./supply-format";
import type { Supply } from "./types";

const SOURCE_LABEL: Record<StockMovementRow["source"], string> = {
  INITIAL: "Saldo inicial",
  MANUAL: "Dashboard",
  EDIT: "Ajuste al editar",
  WHATSAPP: "WhatsApp",
};

/** Fecha del movimiento en hora argentina (fija, para no depender del huso del navegador). */
function formatMovementDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    })
    .replace(/\s+/g, " ");
}

function formatUnitCost(row: StockMovementRow): string {
  if (row.unitCost === null || row.currency === null) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: row.currency, maximumFractionDigits: 2 }).format(
    row.unitCost,
  );
}

export function StockHistoryDialog({ supply, onClose }: { supply: Supply; onClose: () => void }) {
  const [rows, setRows] = useState<StockMovementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStockMovementsAction(supply.id).then((result) => {
      if (cancelled) return;
      if (result.success) setRows(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [supply.id]);

  const unit = supply.unit ?? "";

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de stock</DialogTitle>
          <DialogDescription>
            {supply.name}: hoy hay {formatQuantity(supply.quantity)} {unit}. Cada ingreso y consumo, del dashboard o de
            WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : rows === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay movimientos.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 text-right font-medium">Movimiento</th>
                  <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                  <th className="py-2 pr-3 text-right font-medium">Costo unit.</th>
                  <th className="py-2 pr-3 font-medium">Origen</th>
                  <th className="py-2 font-medium">Potrero</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{formatMovementDate(row.date)}</td>
                    <td
                      className={`py-2 pr-3 text-right font-medium whitespace-nowrap ${row.direction === "IN" ? "text-success" : "text-destructive"}`}
                    >
                      {row.direction === "IN" ? "+" : "−"}
                      {formatQuantity(row.quantity)} {unit}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      {formatQuantity(row.balance)} {unit}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatUnitCost(row)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{SOURCE_LABEL[row.source]}</td>
                    <td className="py-2">{row.pastureName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
