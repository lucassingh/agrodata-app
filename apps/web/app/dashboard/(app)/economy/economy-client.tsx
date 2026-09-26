"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, Plus, Sprout, Wheat } from "lucide-react";
import type { CampaignEconomy, getEconomyOverview } from "@repo/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ExportButton } from "@/components/export-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_STATUS_LABEL, formatDay, formatKg, formatMoney, formatUsd } from "./economy-format";
import { CampaignDetailDialog } from "./campaign-detail-dialog";
import { CampaignFormDialog } from "./campaign-form-dialog";
import { UnassignedIncomes, type UnassignedIncome } from "./unassigned-incomes";

type Overview = Awaited<ReturnType<typeof getEconomyOverview>>;

interface EconomyClientProps {
  overview: Overview | null;
  seasons: string[];
  season: string;
  pastures: { id: string; name: string; hectares: number | null }[];
  unassignedIncomes: UnassignedIncome[];
  canEdit: boolean;
  canDelete: boolean;
}

const ALL = "all";

const STATUS_STYLE: Record<CampaignEconomy["status"], string> = {
  IN_PROGRESS: "bg-[#E8F5EE] text-[#2D6A4F]",
  HARVESTED: "bg-[#FDF4E3] text-[#8A5A12]",
  CLOSED: "bg-muted text-muted-foreground",
};

function Kpi({ label, value, caption, tone }: { label: string; value: string; caption?: string; tone?: "positive" | "negative" }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`font-heading text-2xl font-bold ${tone === "positive" ? "text-[#2D6A4F]" : tone === "negative" ? "text-destructive" : "text-foreground"}`}
        >
          {value}
        </p>
        {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}

export function EconomyClient({ overview, seasons, season, pastures, unassignedIncomes, canEdit, canDelete }: EconomyClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (!overview) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <Sprout className="text-muted-foreground" />
        <p className="font-medium text-foreground">Sin establecimiento activo</p>
        <p className="max-w-sm text-sm text-muted-foreground">Elegí o creá un campo desde el menú de usuario.</p>
      </div>
    );
  }

  const campaigns = overview.campaigns;
  const detail = campaigns.find((c) => c.id === detailId) ?? null;
  const hectares = campaigns.reduce((sum, c) => sum + (c.hectares ?? 0), 0);
  const cost = campaigns.reduce((sum, c) => sum + c.result.costUsd, 0);
  const income = campaigns.reduce((sum, c) => sum + c.result.incomeUsd, 0);
  const margin = income - cost;
  const anyEstimated = campaigns.some((c) => c.result.estimated);
  const unconverted = campaigns.reduce((sum, c) => sum + c.result.unconverted, 0);

  const chartData = campaigns
    .filter((c) => c.result.marginPerHaUsd !== null)
    .map((c) => ({ name: `${c.crop} · ${c.pastureName}`, value: c.result.marginPerHaUsd! }));

  const selectSeason = (value: string) => {
    router.push(value === ALL ? pathname : `${pathname}?season=${encodeURIComponent(value)}`);
  };

  const columns: DataTableColumn<CampaignEconomy>[] = [
    {
      key: "campaign",
      label: "Campaña",
      render: (c) => (
        <div>
          <p className="font-medium whitespace-nowrap">
            {c.crop} {c.season}
          </p>
          <p className="text-xs text-muted-foreground">{c.pastureName}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (c) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[c.status]}`}>
          {CAMPAIGN_STATUS_LABEL[c.status]}
        </span>
      ),
    },
    { key: "hectares", label: "Ha", className: "text-right", render: (c) => (c.hectares ?? "—").toLocaleString("es-AR") },
    { key: "costPerHa", label: "Costo/ha", className: "text-right whitespace-nowrap", render: (c) => formatUsd(c.result.costPerHaUsd) },
    { key: "yield", label: "Rinde", className: "text-right whitespace-nowrap", render: (c) => formatKg(c.result.yieldKgHa, "kg/ha") },
    {
      key: "breakEven",
      label: "Rinde de indiferencia",
      className: "text-right whitespace-nowrap",
      render: (c) => formatKg(c.result.breakEvenYieldKgHa, "kg/ha"),
    },
    {
      key: "margin",
      label: "Margen bruto",
      className: "text-right whitespace-nowrap",
      render: (c) => (
        <div>
          <p className={`font-semibold ${c.result.marginUsd >= 0 ? "text-[#2D6A4F]" : "text-destructive"}`}>
            {formatUsd(c.result.marginUsd)}
            {c.result.estimated ? <span className="ml-1 text-xs font-normal text-muted-foreground">(est.)</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {c.result.marginPerHaUsd !== null ? `${formatUsd(c.result.marginPerHaUsd)}/ha` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (c) => (
        <Button variant="ghost" size="icon-sm" title="Ver campaña" aria-label={`Ver ${c.crop} ${c.season} de ${c.pastureName}`} onClick={() => setDetailId(c.id)}>
          <Eye size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={[{ value: ALL, label: "Todos los ciclos" }, ...seasons.map((s) => ({ value: s, label: `Ciclo ${s}` }))]}
          value={season || ALL}
          onValueChange={(v: string | null) => v && selectSeason(v)}
        >
          <SelectTrigger className="w-44" aria-label="Ciclo agrícola">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los ciclos</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s} value={s}>
                Ciclo {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {overview.vatCondition === "RESPONSABLE_INSCRIPTO" ? "Costos sin IVA (responsable inscripto)" : "Costos con IVA (monotributista)"}
        </span>
        {overview.latestRate ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Dólar {overview.rateLabel}: {formatMoney(overview.latestRate.sell, "ARS")} ({formatDay(overview.latestRate.day)})
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <ExportButton href={`/dashboard/export/economia${season ? `?season=${encodeURIComponent(season)}` : ""}`} />
          {canEdit ? (
            <Button onClick={() => setCreating(true)} disabled={pastures.length === 0} title={pastures.length === 0 ? "Cargá un lote en Potreros primero" : undefined}>
              <Plus size={14} />
              Nueva campaña
            </Button>
          ) : null}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wheat size={26} />
          </span>
          <p className="font-heading text-lg font-semibold">Todavía no hay campañas</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Se abren solas cuando sembrás: mandá por WhatsApp «sembré 100 ha de soja en el Norte» o cargá el cultivo en
            Potreros. Desde ahí, cada aplicación, gasto del lote, cosecha y venta suma a su margen.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Hectáreas" value={hectares.toLocaleString("es-AR")} caption={`${campaigns.length} ${campaigns.length === 1 ? "campaña" : "campañas"}`} />
            <Kpi label="Costos directos" value={formatUsd(cost)} caption={hectares > 0 ? `${formatUsd(cost / hectares)}/ha` : undefined} />
            <Kpi label="Ingresos" value={formatUsd(income)} caption={anyEstimated ? "Incluye ingresos estimados" : undefined} />
            <Kpi
              label="Margen bruto"
              value={formatUsd(margin)}
              caption={hectares > 0 ? `${formatUsd(margin / hectares)}/ha` : undefined}
              tone={margin >= 0 ? "positive" : "negative"}
            />
          </div>

          {unconverted > 0 ? (
            <p className="rounded-lg border border-[#D97706]/30 bg-[#FDF4E3] px-4 py-2 text-sm text-[#8A5A12]">
              {unconverted} {unconverted === 1 ? "movimiento no tiene" : "movimientos no tienen"} cotización del dólar para su fecha y no
              {unconverted === 1 ? " suma" : " suman"} en dólares.
            </p>
          ) : null}

          <DataTable rows={campaigns} columns={columns} />

          {chartData.length > 1 ? (
            <Card className="rounded-2xl shadow-soft">
              <CardContent className="space-y-3">
                <p className="font-heading text-sm font-bold">Margen bruto por hectárea (US$)</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => formatUsd(Number(value))} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.value >= 0 ? "#2D6A4F" : "#C4453A"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {unassignedIncomes.length > 0 ? (
        <UnassignedIncomes incomes={unassignedIncomes} campaigns={campaigns} canEdit={canEdit} />
      ) : null}

      {detail ? (
        <CampaignDetailDialog campaign={detail} canEdit={canEdit} canDelete={canDelete} onClose={() => setDetailId(null)} />
      ) : null}
      {creating ? <CampaignFormDialog pastures={pastures} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
