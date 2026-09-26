"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { CampaignEconomy } from "@repo/core";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignIncomeAction } from "./actions";
import { formatDay, formatMoney } from "./economy-format";

export interface UnassignedIncome {
  id: string;
  date: string;
  crop: string | null;
  amount: number;
  currency: "ARS" | "USD";
  counterparty: string | null;
}

/** Ventas que llegaron sin campaña (ej. por WhatsApp, con varias posibles). */
export function UnassignedIncomes({
  incomes,
  campaigns,
  canEdit,
}: {
  incomes: UnassignedIncome[];
  campaigns: CampaignEconomy[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const items = campaigns.map((c) => ({ value: c.id, label: `${c.crop} ${c.season} · ${c.pastureName}` }));

  const assign = (incomeId: string, campaignId: string) =>
    startTransition(async () => {
      const result = await assignIncomeAction(incomeId, campaignId);
      if (!result.success) return void toast.error(result.error);
      toast.success("Venta asignada");
    });

  return (
    <Card className="rounded-2xl border-[#D97706]/30 shadow-soft">
      <CardContent className="space-y-3">
        <div>
          <p className="font-heading text-sm font-bold">Ventas sin campaña</p>
          <p className="text-xs text-muted-foreground">Asignalas para que sumen al margen del lote que corresponde.</p>
        </div>
        <ul className="divide-y divide-border">
          {incomes.map((income) => (
            <li key={income.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
              <span>
                {formatDay(income.date)} · {income.crop ?? "Venta"}
                {income.counterparty ? ` · ${income.counterparty}` : ""} · <span className="font-medium">{formatMoney(income.amount, income.currency)}</span>
              </span>
              {canEdit && items.length > 0 ? (
                <Select items={items} value={null} onValueChange={(v: string | null) => v && assign(income.id, v)} disabled={isPending}>
                  <SelectTrigger className="w-64" aria-label="Asignar a campaña">
                    <SelectValue placeholder="Asignar a campaña…" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
