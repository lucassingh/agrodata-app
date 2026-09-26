"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { CampaignEconomy, EconomyLine } from "@repo/core";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createHarvestAction,
  createIncomeAction,
  deleteCampaignAction,
  deleteHarvestAction,
  deleteIncomeAction,
  updateCampaignAction,
} from "./actions";
import { CAMPAIGN_STATUS_LABEL, formatDay, formatKg, formatMoney, formatUsd } from "./economy-format";

const ORIGIN_LABEL: Record<EconomyLine["origin"], string> = {
  expense: "Gasto",
  stock: "Insumo aplicado",
  sale: "Venta",
  other: "Otro",
};

function todayInArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

const optionalNumber = (value: string) => (value.trim() === "" ? undefined : Number(value));

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading font-semibold">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Lines({ lines, onDelete }: { lines: (EconomyLine & { quantityKg?: number | null })[]; onDelete?: (id: string) => void }) {
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">Nada cargado todavía.</p>;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {lines.map((line) => (
        <li key={line.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{line.concept}</p>
            <p className="text-xs text-muted-foreground">
              {formatDay(line.date)} · {ORIGIN_LABEL[line.origin]}
              {line.quantityKg ? ` · ${formatKg(line.quantityKg)}` : ""}
              {line.rate ? ` · dólar ${formatMoney(line.rate, "ARS")}${line.rateFromDocument ? " (del comprobante)" : ""}` : " · sin cotización"}
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <div className="text-right">
              <p className="font-medium whitespace-nowrap">{formatUsd(line.usd)}</p>
              <p className="text-xs whitespace-nowrap text-muted-foreground">{formatMoney(line.amount, line.currency)}</p>
            </div>
            {onDelete ? (
              <Button variant="ghost" size="icon-sm" aria-label={`Borrar ${line.concept}`} onClick={() => onDelete(line.id)}>
                <Trash2 size={13} />
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function HarvestForm({ campaignId, onDone }: { campaignId: string; onDone: () => void }) {
  const [date, setDate] = useState(todayInArgentina());
  const [tons, setTons] = useState("");
  const [isPending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      const kg = Number(tons) * 1000;
      if (!Number.isFinite(kg) || kg <= 0) {
        toast.error("Ingresá las toneladas cosechadas");
        return;
      }
      const result = await createHarvestAction(campaignId, { date, totalKg: kg });
      if (!result.success) return void toast.error(result.error);
      toast.success("Cosecha registrada");
      onDone();
    });
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="harvest-date" className="text-xs">Fecha</Label>
        <Input id="harvest-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="harvest-tons" className="text-xs">Toneladas totales</Label>
        <Input id="harvest-tons" type="number" min={0} step={0.1} value={tons} onChange={(e) => setTons(e.target.value)} />
      </div>
      <Button disabled={isPending} onClick={save}>Guardar</Button>
    </div>
  );
}

function IncomeForm({ campaign, onDone }: { campaign: CampaignEconomy; onDone: () => void }) {
  const [date, setDate] = useState(todayInArgentina());
  const [tons, setTons] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("USD");
  const [counterparty, setCounterparty] = useState("");
  const [isPending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      const total = Number(amount);
      if (!Number.isFinite(total) || total <= 0) {
        toast.error("Ingresá el monto de la venta");
        return;
      }
      const result = await createIncomeAction({
        campaignId: campaign.id,
        date,
        crop: campaign.crop,
        quantityKg: optionalNumber(tons) !== undefined ? Number(tons) * 1000 : undefined,
        amount: total,
        currency,
        counterparty: counterparty.trim() || undefined,
      });
      if (!result.success) return void toast.error(result.error);
      toast.success("Venta registrada");
      onDone();
    });
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="income-date" className="text-xs">Fecha</Label>
        <Input id="income-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="income-tons" className="text-xs">Toneladas</Label>
        <Input id="income-tons" type="number" min={0} step={0.1} value={tons} onChange={(e) => setTons(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="income-buyer" className="text-xs">Comprador</Label>
        <Input id="income-buyer" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="income-amount" className="text-xs">Monto total</Label>
        <Input id="income-amount" type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="income-currency" className="text-xs">Moneda</Label>
        <Select
          items={[{ value: "USD", label: "USD" }, { value: "ARS", label: "ARS" }]}
          value={currency}
          onValueChange={(v: string | null) => v && setCurrency(v as "ARS" | "USD")}
        >
          <SelectTrigger id="income-currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="ARS">ARS</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button className="w-full" disabled={isPending} onClick={save}>Guardar venta</Button>
      </div>
    </div>
  );
}

export function CampaignDetailDialog({
  campaign,
  canEdit,
  canDelete,
  onClose,
}: {
  campaign: CampaignEconomy;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState<"harvest" | "income" | null>(null);
  const [referencePrice, setReferencePrice] = useState(campaign.referencePrice ? String(campaign.referencePrice) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const r = campaign.result;

  const act = (fn: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.success) return void toast.error(result.error ?? "No se pudo guardar");
      toast.success(message);
      after?.();
    });

  const savePrice = () =>
    act(() => updateCampaignAction(campaign.id, { referencePrice: optionalNumber(referencePrice) ?? null }), "Precio de referencia guardado");

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {campaign.crop} {campaign.season} · {campaign.pastureName}
          </DialogTitle>
          <DialogDescription>
            {CAMPAIGN_STATUS_LABEL[campaign.status]} · {campaign.hectares ?? "—"} ha · siembra {formatDay(campaign.sowingDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Costos directos" value={formatUsd(r.costUsd)} hint={r.costPerHaUsd !== null ? `${formatUsd(r.costPerHaUsd)}/ha` : undefined} />
          <Figure label="Rinde" value={formatKg(r.yieldKgHa, "kg/ha")} hint={campaign.harvestedKg > 0 ? formatKg(campaign.harvestedKg) : undefined} />
          <Figure label={r.estimated ? "Ingresos (estimados)" : "Ingresos"} value={formatUsd(r.incomeUsd)} hint={r.priceUsdPerTon ? `${formatUsd(r.priceUsdPerTon)}/t` : undefined} />
          <Figure label="Margen bruto" value={formatUsd(r.marginUsd)} hint={r.marginPerHaUsd !== null ? `${formatUsd(r.marginPerHaUsd)}/ha` : undefined} />
        </div>
        <p className="text-sm text-muted-foreground">
          Rinde de indiferencia: <span className="font-medium text-foreground">{formatKg(r.breakEvenYieldKgHa, "kg/ha")}</span>
          {r.breakEvenYieldKgHa === null ? " (hace falta un precio de venta o de referencia y las hectáreas)" : " para cubrir los costos directos."}
        </p>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Costos directos</h3>
          <Lines lines={campaign.costs} />
          <p className="text-xs text-muted-foreground">
            Llegan solos: insumos aplicados en el lote, y gastos que nombran el lote o que asignás desde Gastos.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Cosechas</h3>
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setAdding(adding === "harvest" ? null : "harvest")}>
                Registrar cosecha
              </Button>
            ) : null}
          </div>
          {adding === "harvest" ? <HarvestForm campaignId={campaign.id} onDone={() => setAdding(null)} /> : null}
          {campaign.harvests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cosecha registrada.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {campaign.harvests.map((h) => (
                <li key={h.id} className="flex items-center justify-between px-3 py-2">
                  <span>
                    {formatDay(h.date)} · {formatKg(h.totalKg)}
                  </span>
                  {canEdit ? (
                    <Button variant="ghost" size="icon-sm" aria-label="Borrar cosecha" onClick={() => act(() => deleteHarvestAction(h.id), "Cosecha borrada")}>
                      <Trash2 size={13} />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Ventas</h3>
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setAdding(adding === "income" ? null : "income")}>
                Registrar venta
              </Button>
            ) : null}
          </div>
          {adding === "income" ? <IncomeForm campaign={campaign} onDone={() => setAdding(null)} /> : null}
          <Lines
            lines={campaign.incomes}
            onDelete={canEdit ? (id) => act(() => deleteIncomeAction(id), "Venta borrada") : undefined}
          />
        </section>

        {canEdit ? (
          <section className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
            <div className="space-y-1">
              <Label htmlFor="reference-price" className="text-xs">Precio de referencia (US$/t)</Label>
              <Input id="reference-price" type="number" min={0} className="w-40" value={referencePrice} onChange={(e) => setReferencePrice(e.target.value)} />
            </div>
            <Button variant="outline" disabled={isPending} onClick={savePrice}>Guardar precio</Button>
            <div className="ml-auto flex gap-2">
              {campaign.status !== "CLOSED" ? (
                <Button variant="outline" disabled={isPending} onClick={() => act(() => updateCampaignAction(campaign.id, { status: "CLOSED" }), "Campaña cerrada")}>
                  Cerrar campaña
                </Button>
              ) : (
                <Button variant="outline" disabled={isPending} onClick={() => act(() => updateCampaignAction(campaign.id, { status: "HARVESTED" }), "Campaña reabierta")}>
                  Reabrir
                </Button>
              )}
              {canDelete ? (
                <Button variant="destructive" disabled={isPending} onClick={() => setConfirmDelete(true)}>
                  Eliminar
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        <ConfirmDialog
          open={confirmDelete}
          title="Eliminar campaña"
          description="Se borran la campaña, sus cosechas y la asignación de costos. Los gastos y el stock no se tocan; las ventas quedan sin campaña."
          confirmLabel="Eliminar"
          confirmVariant="destructive"
          loading={isPending}
          onConfirm={() => act(() => deleteCampaignAction(campaign.id), "Campaña eliminada", onClose)}
          onClose={() => !isPending && setConfirmDelete(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
