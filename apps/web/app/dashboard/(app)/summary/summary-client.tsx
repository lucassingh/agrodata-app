"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Fence,
  Package,
  Wallet,
  AlertTriangle,
  MapPin,
  Upload,
  BarChart3,
  Sprout,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeroBanner } from "@/components/hero-banner";
import { CowHeadIcon } from "@/components/cow-head-icon";
import { getRecordConfig } from "../data/record-constants";
import { formatRecordDescription, formatRecordSource } from "../data/record-format";
import { formatRelativeDate, formatArs } from "./summary-format";
import type { DashboardSummaryData } from "./types";

const PIE_COLORS = ["#2D6A4F", "#D97706", "#3B7DC4", "#C4453A", "#7C3AED", "#0F766E", "#D4930D", "#10B981"];

const KPI_DEFS: { key: keyof DashboardSummaryData["kpis"]; label: string }[] = [
  { key: "animales", label: "Animales" },
  { key: "lluvia", label: "Lluvia (mm)" },
  { key: "mortandad", label: "Mortandad" },
  { key: "ventas", label: "Ventas" },
  { key: "compras", label: "Compras" },
  { key: "datosIngresados", label: "Datos ingresados" },
];

interface SummaryClientProps {
  dashboard: DashboardSummaryData;
  hasActiveTenant: boolean;
}

export function SummaryClient({ dashboard, hasActiveTenant }: SummaryClientProps) {
  const router = useRouter();

  if (!hasActiveTenant) {
    return (
      <div className="space-y-6">
        <HeroBanner title="Resumen" subtitle="Indicadores y actividad reciente de tu establecimiento." />
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sprout size={28} />
          </span>
          <p className="font-heading text-lg font-semibold">Empezá creando tu campo</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Todavía no tenés un establecimiento seleccionado. Creá uno desde el menú o seguí la guía inicial:
            después vas a ver acá KPIs, últimos registros y el mapa.
          </p>
          <Button onClick={() => router.push("/dashboard/how-start")}>Ir a cómo empezar</Button>
        </div>
      </div>
    );
  }

  const pieData = dashboard.expensesByCategory
    .filter((c) => c.total > 0)
    .map((c, i) => ({ name: c.name, value: c.total, color: c.color || PIE_COLORS[i % PIE_COLORS.length]! }));

  const ultimosRows = dashboard.recentRecords.slice(0, 8);

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Resumen del campo"
        subtitle="Indicadores según tus registros, actividad reciente y estado operativo."
      />

      {dashboard.kpis.datosIngresados === 0 ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Campo nuevo: los números de arriba son reales (hoy en cero). Cargá datos desde Potreros, Tareas o Datos.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {KPI_DEFS.map((def) => (
          <KpiCard key={def.key} id={def.key} label={def.label} value={dashboard.kpis[def.key]} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewStat
          icon={<Fence size={18} />}
          value={dashboard.totalPastures}
          label="Potreros"
          caption={dashboard.totalHectares > 0 ? `${dashboard.totalHectares.toFixed(0)} ha totales` : undefined}
        />
        <OverviewStat icon={<CowHeadIcon size={18} />} value={dashboard.totalAnimals} label="Animales" color="#7C6445" />
        <OverviewStat icon={<Package size={18} />} value={dashboard.totalSupplies} label="Insumos" />
        <OverviewStat
          icon={<Wallet size={18} />}
          value={formatArs(dashboard.totalExpenses)}
          label="Gastos totales"
          caption={dashboard.totalExpensesUsd > 0 ? `+ USD ${new Intl.NumberFormat("es-AR").format(dashboard.totalExpensesUsd)}` : undefined}
          color="#D97706"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <p className="font-heading text-sm font-bold">Animales por tipo</p>
            {dashboard.animalsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin animales cargados. Agregalos desde Potreros.</p>
            ) : (
              <ul className="space-y-2">
                {dashboard.animalsByType.map((a) => (
                  <li key={a.type} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5">
                      <CowHeadIcon size={14} />
                      {a.type}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "#7C64451a", color: "#7C6445" }}
                    >
                      {a.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <p className="font-heading text-sm font-bold">Cultivos</p>
            {dashboard.cropSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cultivos asignados. Agregalos desde Potreros.</p>
            ) : (
              <ul className="space-y-2">
                {dashboard.cropSummary.map((c) => (
                  <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Sprout size={14} />
                      {c.name}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "#2D6A4F1a", color: "#2D6A4F" }}
                    >
                      {c.count} {c.count === 1 ? "potrero" : "potreros"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <p className="font-heading text-sm font-bold">Distribución de gastos (en pesos)</p>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos cargados. Registrá gastos desde la sección Gastos.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatArs(Number(value))} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "0.72rem", fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-bold">Últimos datos</p>
              <span title="Registros más recientes del campo." className="text-muted-foreground">
                <BarChart3 size={16} />
              </span>
            </div>
            {ultimosRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay registros. Cargá datos desde Datos, Potreros o Tareas.
              </p>
            ) : (
              <ul className="space-y-3">
                {ultimosRows.map((r) => {
                  const config = getRecordConfig(r.type, r.data);
                  const Icon = config.icon;
                  return (
                    <li key={r.id} className="flex items-center gap-2.5">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{formatRecordDescription(r)}</p>
                        <p className="text-xs text-muted-foreground">{formatRecordSource(r.source)}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeDate(r.occurredAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {dashboard.supplyAlerts.length > 0 ? (
            <Card className="rounded-2xl border-l-4 border-l-warning shadow-soft">
              <CardContent className="space-y-3">
                <p className="flex items-center gap-1.5 font-heading text-sm font-bold">
                  <AlertTriangle size={16} className="text-warning" />
                  Insumos con stock bajo
                </p>
                <ul className="space-y-2">
                  {dashboard.supplyAlerts.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Package size={14} />
                        {s.name}
                        {s.category ? <span className="text-xs text-muted-foreground">({s.category.name})</span> : null}
                      </span>
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                        {s.quantity} {s.unit ?? "u."}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="space-y-2">
              <p className="font-heading text-sm font-bold">Resumen operativo</p>
              <StatRow label="Potreros" value={dashboard.totalPastures} />
              <StatRow label="Hectáreas totales" value={`${dashboard.totalHectares.toFixed(1)} ha`} />
              <StatRow label="Tareas pendientes" value={`${dashboard.pendingTasks} / ${dashboard.totalTasks}`} />
              <StatRow label="Insumos" value={dashboard.totalSupplies} />
              <StatRow label="Usuarios activos" value={dashboard.totalUsers} />
              <StatRow label="Tipos de registro" value={dashboard.recordsByType.length} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <MapPin size={20} />
              </span>
              <div className="flex-1 space-y-1">
                <p className="font-heading text-sm font-bold">Mapa del campo</p>
                <p className="text-xs text-muted-foreground">
                  No hay mapa cargado. Subí un archivo para visualizar límites y potreros.
                </p>
              </div>
              <Button size="sm">
                <Upload size={16} />
                Subir mapa
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ id, label, value }: { id: string; label: string; value: number }) {
  const v = Number.isFinite(value) ? value : 0;
  const data = Array.from({ length: 8 }, (_, i) => ({ i, v }));
  const gradientId = `summary-spark-${id}`;

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-2xl font-extrabold">{value}</p>
          <Minus size={20} strokeWidth={2.5} className="text-[#D4930D]" />
        </div>
        <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--primary)"
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewStat({
  icon,
  value,
  label,
  caption,
  color = "var(--primary)",
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  caption?: string;
  color?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="flex flex-col items-center gap-1 py-2 text-center">
        <span style={{ color }}>{icon}</span>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {caption ? <p className="text-[11px] text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
