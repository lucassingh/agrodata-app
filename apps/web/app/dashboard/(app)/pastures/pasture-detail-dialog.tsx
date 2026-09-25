"use client";

import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CowHeadIcon } from "@/components/cow-head-icon";
import { listPastureHistoryAction, type LivestockEventRow } from "./actions";
import type { Pasture } from "./types";

const EVENT_LABEL: Record<LivestockEventRow["type"], string> = {
  BIRTH: "Nacimiento",
  PURCHASE: "Compra",
  SALE: "Venta",
  DEATH: "Mortandad",
  TRANSFER_IN: "Entrada desde otro potrero",
  TRANSFER_OUT: "Salida a otro potrero",
  ADJUSTMENT_IN: "Alta manual",
  ADJUSTMENT_OUT: "Baja manual",
};

const INFLOW = new Set<LivestockEventRow["type"]>(["BIRTH", "PURCHASE", "TRANSFER_IN", "ADJUSTMENT_IN"]);

function formatEventDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    })
    .replace(/\s+/g, " ");
}

function formatAmount(row: LivestockEventRow): string | null {
  if (row.amount === null || row.currency === null) return null;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: row.currency, maximumFractionDigits: 0 }).format(
    row.amount,
  );
}

function PastureHistory({ pastureId }: { pastureId: string }) {
  const [rows, setRows] = useState<LivestockEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPastureHistoryAction(pastureId).then((result) => {
      if (cancelled) return;
      if (result.success) setRows(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [pastureId]);

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (rows === null) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (rows.length === 0) return <p className="text-sm">Todavía no hay movimientos de hacienda.</p>;

  return (
    <ul className="max-h-64 divide-y divide-border overflow-auto rounded-lg border border-border">
      {rows.map((row) => {
        const inflow = INFLOW.has(row.type);
        const amount = formatAmount(row);
        return (
          <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <div>
              <p className="font-medium">
                <span className={inflow ? "text-success" : "text-destructive"}>
                  {inflow ? "+" : "−"}
                  {row.quantity}
                </span>{" "}
                {row.animalType}
              </p>
              <p className="text-xs text-muted-foreground">
                {EVENT_LABEL[row.type]}
                {row.counterparty ? ` · ${row.counterparty}` : ""}
                {amount ? ` · ${amount}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{formatEventDate(row.date)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PastureDetailDialog({
  pasture,
  restDays,
  onClose,
}: {
  pasture: Pasture;
  restDays: number | null;
  onClose: () => void;
}) {
  const occupied = pasture.animals.some((a) => a.quantity > 0);

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del potrero</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{pasture.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Superficie</p>
              <p className="font-medium">{pasture.hectares ? `${pasture.hectares} ha` : "Sin definir"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Descanso</p>
              <p className="font-medium">
                {occupied ? "Con hacienda" : restDays === null ? "Sin datos" : `${restDays} ${restDays === 1 ? "día" : "días"}`}
              </p>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">Cultivos</p>
            {pasture.crops.length === 0 ? (
              <p className="text-sm">Sin cultivos</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pasture.crops.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2 py-0.5 text-xs font-medium text-[#2D6A4F]"
                  >
                    <Sprout size={11} />
                    {c.crop}
                    {c.hectares ? ` · ${c.hectares} ha` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">Animales</p>
            {pasture.animals.length === 0 ? (
              <p className="text-sm">Sin animales</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pasture.animals.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded-full bg-[#FDF4E3] px-2 py-0.5 text-xs font-medium text-[#7C6445]"
                  >
                    <CowHeadIcon size={11} />
                    {a.quantity} {a.animalType}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">Movimientos de hacienda</p>
            <PastureHistory pastureId={pasture.id} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
