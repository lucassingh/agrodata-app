"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PortfolioField } from "@repo/core/portfolio/portfolio.service";
import { ranking } from "@repo/core/portfolio/portfolio-math";
import { activitiesLabel } from "@repo/core/tenants/tenant-labels";
import { FIELD_ROLE_LABEL } from "@repo/core/auth/field-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { setActiveTenantAction } from "@/app/dashboard/(app)/_lib/tenant-actions";
import { ReportButton, type ReportSignature } from "@/components/report-dialog";
import { formatArs, formatUsd } from "@/app/dashboard/(app)/economy/economy-format";

type Field = Omit<PortfolioField, "lastEntryAt"> & { lastEntryAt: string | null };

const number = (value: number, digits: number, fixed = false) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: fixed ? digits : 0 }).format(value);

/** Solo el día, con huso fijo: igual en el servidor y en el navegador. */
function formatEntry(iso: string | null): string {
  if (!iso) return "Sin cargas";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const Muted = ({ children }: { children: React.ReactNode }) => <span className="text-muted-foreground">{children}</span>;

function Comparison({
  title,
  rows,
  format,
}: {
  title: string;
  rows: { tenantId: string; name: string; value: number }[];
  format: (value: number) => string;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3">
        <p className="font-heading text-sm font-bold">{title}</p>
        <div className="h-56" role="img" aria-label={`${title}: ${rows.map((r) => `${r.name} ${format(r.value)}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => format(Number(value))} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {rows.map((r) => (
                  <Cell key={r.tenantId} fill={r.value >= 0 ? "#2D6A4F" : "#C4453A"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function PortfolioClient({
  fields,
  activeTenantId,
  signature,
}: {
  fields: Field[];
  activeTenantId: string | null;
  signature: ReportSignature;
}) {
  const router = useRouter();
  const [entering, startEnter] = useTransition();

  const enter = (field: Field) => {
    startEnter(async () => {
      if (field.tenantId !== activeTenantId) {
        const result = await setActiveTenantAction(field.tenantId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      }
      router.push("/dashboard/summary");
    });
  };

  const columns: DataTableColumn<Field>[] = [
    {
      key: "field",
      label: "Campo",
      render: (f) => (
        <div className="min-w-44">
          <p className="font-medium">
            {f.name}{" "}
            {f.tenantId === activeTenantId ? (
              <Badge variant="outline" className="ml-1 align-middle">
                Activo
              </Badge>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{activitiesLabel(f.activities)}</p>
          <p className="text-xs text-muted-foreground">
            {f.owner && f.myRole !== "OWNER" ? `Dueño: ${f.owner} · ` : ""}
            Sos {FIELD_ROLE_LABEL[f.myRole].toLowerCase()}
          </p>
        </div>
      ),
    },
    {
      key: "margin",
      label: "Margen/ha",
      className: "text-right whitespace-nowrap",
      render: (f) =>
        f.agriculture ? (
          f.agriculture.marginPerHaUsd !== null ? (
            <span className={f.agriculture.marginPerHaUsd < 0 ? "text-destructive" : undefined}>
              {formatUsd(f.agriculture.marginPerHaUsd)}
            </span>
          ) : (
            <Muted>Sin campañas</Muted>
          )
        ) : (
          <Muted>—</Muted>
        ),
    },
    {
      key: "adpv",
      label: "ADPV",
      className: "text-right whitespace-nowrap",
      render: (f) =>
        f.livestock ? (
          f.livestock.adpv !== null ? `${number(f.livestock.adpv, 2, true)} kg/día` : <Muted>Sin pesadas</Muted>
        ) : (
          <Muted>—</Muted>
        ),
    },
    {
      key: "dairy",
      label: "Tambo (30 días)",
      className: "text-right whitespace-nowrap",
      render: (f) =>
        f.dairy ? (
          f.dairy.liters > 0 ? (
            <div>
              <p>{f.dairy.litersPerCowDay !== null ? `${number(f.dairy.litersPerCowDay, 1)} L/vaca/día` : "—"}</p>
              <p className="text-xs text-muted-foreground">
                {f.dairy.marginPerLiter !== null ? `Margen $ ${number(f.dairy.marginPerLiter, 2)}/L` : "Sin liquidación"}
              </p>
            </div>
          ) : (
            <Muted>Sin litros</Muted>
          )
        ) : (
          <Muted>—</Muted>
        ),
    },
    {
      key: "expenses",
      label: "Gastos del mes",
      className: "text-right whitespace-nowrap",
      render: (f) => (
        <div>
          <p>{formatArs(f.expensesMonth.ars)}</p>
          {f.expensesMonth.usd > 0 ? <p className="text-xs text-muted-foreground">+ {formatUsd(f.expensesMonth.usd)}</p> : null}
        </div>
      ),
    },
    {
      key: "alerts",
      label: "Avisos",
      render: (f) =>
        f.alerts.total === 0 ? (
          <Muted>Sin avisos</Muted>
        ) : (
          <div className="flex max-w-56 flex-col items-start gap-1">
            <Badge
              variant="outline"
              className={f.alerts.critical > 0 ? "border-destructive/40 text-destructive" : "border-[#D97706]/40 text-[#8A5A12]"}
            >
              {f.alerts.total} {f.alerts.total === 1 ? "aviso" : "avisos"}
              {f.alerts.critical > 0 ? ` · ${f.alerts.critical} ${f.alerts.critical === 1 ? "urgente" : "urgentes"}` : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">{f.alerts.top}</span>
          </div>
        ),
    },
    {
      key: "last",
      label: "Última carga",
      className: "whitespace-nowrap",
      render: (f) => (f.lastEntryAt ? formatEntry(f.lastEntryAt) : <Muted>Sin cargas</Muted>),
    },
    {
      key: "enter",
      label: "",
      className: "text-right",
      render: (f) => (
        <div data-tour="cartera.row-actions" className="flex justify-end gap-2">
          <ReportButton tenantId={f.tenantId} tenantName={f.name} signature={signature} size="sm" variant="outline" />
          <Button size="sm" disabled={entering} onClick={() => enter(f)} aria-label={`Entrar a ${f.name}`}>
            Entrar
            <ArrowRight size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const byMargin = ranking(fields.map((f) => ({ tenantId: f.tenantId, name: f.name, value: f.agriculture?.marginPerHaUsd ?? null })));
  const byAdpv = ranking(fields.map((f) => ({ tenantId: f.tenantId, name: f.name, value: f.livestock?.adpv ?? null })));
  const byLiters = ranking(fields.map((f) => ({ tenantId: f.tenantId, name: f.name, value: f.dairy?.litersPerCowDay ?? null })));
  const comparisons = [
    byMargin.length > 1 ? <Comparison key="m" title="Margen bruto por hectárea (US$)" rows={byMargin} format={(v) => formatUsd(v)} /> : null,
    byAdpv.length > 1 ? <Comparison key="a" title="ADPV (kg/día)" rows={byAdpv} format={(v) => `${number(v, 2, true)} kg/día`} /> : null,
    byLiters.length > 1 ? (
      <Comparison key="l" title="Litros por vaca por día" rows={byLiters} format={(v) => `${number(v, 1)} L`} />
    ) : null,
  ].filter(Boolean);

  const season = fields[0]?.season;
  const pending = fields.reduce((sum, f) => sum + f.alerts.total, 0);

  return (
    <div className="space-y-6">
      {fields.length < 2 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          La cartera sirve para comparar campos. Cuando sumes otro, propio o como asesor de un cliente, lo vas a ver acá.
        </p>
      ) : null}

      <div data-tour="cartera.kpis" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl shadow-soft">
          <CardContent>
            <p className="text-xs text-muted-foreground">Campos</p>
            <p className="font-heading text-2xl font-bold">{fields.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-soft">
          <CardContent>
            <p className="text-xs text-muted-foreground">Campaña</p>
            <p className="font-heading text-2xl font-bold">{season ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 rounded-2xl shadow-soft sm:col-span-1">
          <CardContent>
            <p className="text-xs text-muted-foreground">Avisos en toda la cartera</p>
            <p className="font-heading text-2xl font-bold">{pending}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable rows={fields} columns={columns} tour="cartera.table" />
      <p className="text-xs text-muted-foreground">
        Margen/ha: campaña {season} en dólares, ponderado por superficie. ADPV: promedio de los grupos con pesadas, por
        cabezas. Tambo: últimos 30 días, margen sobre alimentación.
      </p>

      {comparisons.length > 0 ? <div data-tour="cartera.compare" className="grid gap-4 lg:grid-cols-2">{comparisons}</div> : null}
    </div>
  );
}
