"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Milk, Plus, Trash2 } from "lucide-react";
import type { getDairyOverview } from "@repo/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMilkRecordAction, deleteMilkSettlementAction, saveMilkRecordAction } from "./actions";
import { SettlementDialog } from "./settlement-dialog";

type Overview = Awaited<ReturnType<typeof getDairyOverview>>;

const number = (value: number | null, digits = 0) =>
  value === null ? "—" : new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits }).format(value);
const pesos = (value: number | null, digits = 0) => (value === null ? "—" : `$ ${number(value, digits)}`);
const dayMonth = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
const fullDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

function todayInArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

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

function MilkDayForm() {
  const [date, setDate] = useState(todayInArgentina());
  const [liters, setLiters] = useState("");
  const [cows, setCows] = useState("");
  const [isPending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      const value = Number(liters);
      if (!Number.isFinite(value) || value <= 0) return void toast.error("Ingresá los litros del día");
      const result = await saveMilkRecordAction({ date, liters: value, cowsMilking: cows ? Number(cows) : undefined });
      if (!result.success) return void toast.error(result.error);
      toast.success("Litros guardados");
      setLiters("");
    });
  return (
    <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <div className="space-y-1">
        <Label htmlFor="milk-date" className="text-xs">Fecha</Label>
        <Input id="milk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="milk-liters" className="text-xs">Litros del día</Label>
        <Input id="milk-liters" type="number" min={0} value={liters} onChange={(e) => setLiters(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="milk-cows" className="text-xs">Vacas en ordeño</Label>
        <Input id="milk-cows" type="number" min={0} value={cows} onChange={(e) => setCows(e.target.value)} />
      </div>
      <Button disabled={isPending} onClick={save}>Guardar</Button>
    </div>
  );
}

export function DairyClient({ overview, canEdit }: { overview: Overview | null; canEdit: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!overview) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <Milk className="text-muted-foreground" />
        <p className="font-medium text-foreground">Sin establecimiento activo</p>
        <p className="max-w-sm text-sm text-muted-foreground">Elegí o creá un campo desde el menú de usuario.</p>
      </div>
    );
  }

  const { summary, margin } = overview;
  const setPeriod = (from: string, to: string) => router.push(`${pathname}?from=${from}&to=${to}`);
  const remove = (fn: () => Promise<{ success: boolean; error?: string }>, message: string) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.success) return void toast.error(result.error ?? "No se pudo borrar");
      toast.success(message);
    });

  const chartData = overview.days.map((d) => ({ day: dayMonth(d.day), litros: d.liters, porVaca: d.litersPerCow }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="dairy-from" className="text-xs text-muted-foreground">Desde</Label>
          <Input id="dairy-from" type="date" className="h-8 w-40" value={overview.period.from} max={overview.period.to} onChange={(e) => e.target.value && setPeriod(e.target.value, overview.period.to)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dairy-to" className="text-xs text-muted-foreground">Hasta</Label>
          <Input id="dairy-to" type="date" className="h-8 w-40" value={overview.period.to} min={overview.period.from} onChange={(e) => e.target.value && setPeriod(overview.period.from, e.target.value)} />
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Alimento {overview.vatCondition === "RESPONSABLE_INSCRIPTO" ? "sin IVA" : "con IVA"}
        </span>
        {canEdit ? (
          <Button className="ml-auto" variant="outline" onClick={() => setSettlementOpen(true)}>
            <Plus size={14} />
            Cargar liquidación
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Litros del período" value={number(summary.liters)} caption={`${summary.days} ${summary.days === 1 ? "día" : "días"} cargados`} />
        <Kpi label="Litros por día" value={number(summary.litersPerDay)} />
        <Kpi label="Litros por vaca por día" value={number(summary.litersPerCowDay, 1)} />
        <Kpi label="Precio por litro" value={pesos(margin.incomePerLiter, 2)} caption={overview.priceIsReference ? "De la última liquidación" : undefined} />
        <Kpi label="Alimento por litro" value={pesos(margin.feedCostPerLiter, 2)} />
        <Kpi
          label="Margen sobre alimentación"
          value={margin.marginPerLiter === null ? "—" : `${pesos(margin.marginPerLiter, 2)}/L`}
          caption={margin.marginTotal !== null ? `${pesos(margin.marginTotal)} en el período` : "Falta una liquidación o litros cargados"}
          tone={margin.marginPerLiter === null ? undefined : margin.marginPerLiter >= 0 ? "positive" : "negative"}
        />
      </div>

      {chartData.length > 0 ? (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <p className="font-heading text-sm font-bold">Litros por día y por vaca</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="v" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [number(Number(value), 1), name === "litros" ? "Litros" : "L por vaca"]} />
                  <Bar yAxisId="l" dataKey="litros" fill="#2D6A4F" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="v" dataKey="porVaca" stroke="#D97706" strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <p className="font-heading text-sm font-bold">Producción diaria</p>
            {canEdit ? <MilkDayForm /> : null}
            {overview.days.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin litros cargados en el período. También se cargan por WhatsApp: «hoy 3200 litros con 140 vacas».</p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-auto rounded-lg border border-border text-sm">
                {[...overview.days].reverse().map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">{fullDay(d.day)}</span>
                    <span className="font-medium">{number(d.liters)} L</span>
                    <span className="text-muted-foreground">{d.cowsMilking ? `${d.cowsMilking} vacas · ${number(d.litersPerCow, 1)} L/vaca` : "—"}</span>
                    {canEdit ? (
                      <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Borrar litros del ${fullDay(d.day)}`} onClick={() => remove(() => deleteMilkRecordAction(d.id), "Día borrado")}>
                        <Trash2 size={13} />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="space-y-3">
              <p className="font-heading text-sm font-bold">Liquidaciones</p>
              {overview.settlements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin liquidaciones en el período. Mandá la foto por WhatsApp o cargala acá.</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {overview.settlements.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-2">
                      <div>
                        <p className="font-medium">
                          {s.dairy ?? "Liquidación"} · {dayMonth(s.periodStart)} al {dayMonth(s.periodEnd)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {number(s.liters)} L
                          {s.fatPct !== null ? ` · grasa ${number(s.fatPct, 2)} %` : ""}
                          {s.proteinPct !== null ? ` · proteína ${number(s.proteinPct, 2)} %` : ""}
                        </p>
                      </div>
                      <div className="flex items-start gap-1">
                        <div className="text-right">
                          <p className="font-medium whitespace-nowrap">{s.currency === "USD" ? "US$" : "$"} {number(s.pricePerLiter, 2)}/L</p>
                          <p className="text-xs whitespace-nowrap text-muted-foreground">{s.currency === "USD" ? "US$" : "$"} {number(s.totalAmount)}</p>
                        </div>
                        {canEdit ? (
                          <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label="Borrar liquidación" onClick={() => remove(() => deleteMilkSettlementAction(s.id), "Liquidación borrada")}>
                            <Trash2 size={13} />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="space-y-3">
              <p className="font-heading text-sm font-bold">Alimentación del período</p>
              {overview.feed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin consumos de alimento en el período. Se toman de Insumos: los consumos de insumos de alimentación
                  (balanceado, silo, rollos…) valorizados a su costo.
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {overview.feed.map((f) => (
                    <li key={f.supply} className="flex justify-between gap-3 py-1.5">
                      <span>
                        {f.supply} <span className="text-muted-foreground">· {number(f.quantity, 1)} {f.unit ?? ""}</span>
                      </span>
                      <span className="font-medium">{pesos(f.costArs)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {overview.feedUnvalued > 0 ? (
                <p className="text-xs text-[#8A5A12]">
                  {overview.feedUnvalued} {overview.feedUnvalued === 1 ? "consumo no tiene" : "consumos no tienen"} costo cargado y no suman.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {settlementOpen ? <SettlementDialog onClose={() => setSettlementOpen(false)} /> : null}
    </div>
  );
}
