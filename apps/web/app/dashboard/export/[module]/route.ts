import {
  AppError,
  getEconomyOverview,
  listExpenses,
  listPastures,
  listSupplies,
  listTasks,
  listTenantLivestockEvents,
  listTenantRecordsWithAuthor,
  listTenantStockMovements,
} from "@repo/core";
import { requireActiveTenantId } from "@/lib/session";
import { argentinaDay, buildWorkbook, dateOnly, type Sheet } from "@/lib/excel";
import {
  LIVESTOCK_EVENT_LABEL,
  LIVESTOCK_INFLOW,
} from "../../(app)/pastures/livestock-labels";
import { TASK_TYPE_LABEL } from "../../(app)/tasks/task-labels";
import {
  formatRecordDescription,
  formatRecordSource,
} from "../../(app)/data/record-format";
import { getRecordConfig } from "../../(app)/data/record-constants";
import { CAMPAIGN_STATUS_LABEL } from "../../(app)/economy/economy-format";

const STOCK_SOURCE_LABEL = {
  INITIAL: "Saldo inicial",
  MANUAL: "Dashboard",
  EDIT: "Ajuste al editar",
  WHATSAPP: "WhatsApp",
};

async function insumos(tenantId: string): Promise<Sheet[]> {
  const [supplies, movements] = await Promise.all([
    listSupplies(tenantId),
    listTenantStockMovements(tenantId),
  ]);
  return [
    {
      name: "Insumos",
      columns: [
        "Insumo",
        "Categoría",
        "Stock",
        "Unidad",
        "Costo unitario",
        "Moneda",
        "Proveedor",
      ],
      rows: supplies.map((s) => ({
        Insumo: s.name,
        Categoría: s.category.name,
        Stock: s.quantity,
        Unidad: s.unit,
        "Costo unitario": s.cost,
        Moneda: s.cost !== null ? s.currency : null,
        Proveedor: s.supplier,
      })),
    },
    {
      name: "Movimientos de stock",
      columns: [
        "Fecha",
        "Insumo",
        "Movimiento",
        "Cantidad",
        "Unidad",
        "Saldo",
        "Costo unitario",
        "Moneda",
        "Origen",
        "Potrero",
      ],
      rows: movements.map((m) => ({
        Fecha: argentinaDay(m.date),
        Insumo: m.supply.name,
        Movimiento: m.direction === "IN" ? "Ingreso" : "Consumo",
        Cantidad: m.quantity,
        Unidad: m.supply.unit,
        Saldo: m.balance,
        "Costo unitario": m.unitCost,
        Moneda: m.currency,
        Origen: STOCK_SOURCE_LABEL[m.source],
        Potrero: m.pasture?.name ?? null,
      })),
    },
  ];
}

async function gastos(
  tenantId: string,
  params: URLSearchParams,
): Promise<Sheet[]> {
  const currency = params.get("currency");
  const expenses = await listExpenses(tenantId, {
    currency: currency === "ARS" || currency === "USD" ? currency : undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
  });
  return [
    {
      name: "Gastos",
      columns: ["Fecha", "Categoría", "Descripción", "Monto", "Moneda", "IVA"],
      rows: expenses.map((e) => ({
        Fecha: dateOnly(e.date),
        Categoría: e.category.name,
        Descripción: e.description,
        Monto: e.amount,
        Moneda: e.currency,
        IVA: e.withIva ? "Con IVA" : "Sin IVA",
      })),
    },
  ];
}

async function potreros(tenantId: string): Promise<Sheet[]> {
  const [pastures, events] = await Promise.all([
    listPastures(tenantId),
    listTenantLivestockEvents(tenantId),
  ]);
  return [
    {
      name: "Potreros",
      columns: [
        "Potrero",
        "Hectáreas",
        "Cultivos",
        "Animales",
        "Total de animales",
      ],
      rows: pastures.map((p) => ({
        Potrero: p.name,
        Hectáreas: p.hectares,
        Cultivos:
          p.crops
            .map((c) => (c.hectares ? `${c.crop} (${c.hectares} ha)` : c.crop))
            .join(", ") || null,
        Animales:
          p.animals.map((a) => `${a.quantity} ${a.animalType}`).join(", ") ||
          null,
        "Total de animales": p.animals.reduce((sum, a) => sum + a.quantity, 0),
      })),
    },
    {
      name: "Movimientos de hacienda",
      columns: [
        "Fecha",
        "Potrero",
        "Movimiento",
        "Tipo de animal",
        "Cantidad",
        "Kg totales",
        "Monto",
        "Moneda",
        "Contraparte",
      ],
      rows: events.map((e) => ({
        Fecha: argentinaDay(e.date),
        Potrero: e.pasture?.name ?? null,
        Movimiento: LIVESTOCK_EVENT_LABEL[e.type],
        "Tipo de animal": e.animalType,
        Cantidad: LIVESTOCK_INFLOW.has(e.type) ? e.quantity : -e.quantity,
        "Kg totales": e.totalKg,
        Monto: e.amount,
        Moneda: e.currency,
        Contraparte: e.counterparty,
      })),
    },
  ];
}

async function tareas(tenantId: string): Promise<Sheet[]> {
  const tasks = await listTasks(tenantId);
  return [
    {
      name: "Tareas",
      columns: [
        "Fecha límite",
        "Tipo",
        "Estado",
        "Potreros",
        "Cultivo",
        "Productos",
        "Animales",
        "Responsable",
        "Contratista",
        "Descripción",
      ],
      rows: tasks.map((t) => ({
        "Fecha límite": dateOnly(t.deadline),
        Tipo: TASK_TYPE_LABEL[t.type],
        Estado: t.status === "COMPLETED" ? "Completada" : "Pendiente",
        Potreros:
          t.pastures
            .map((p) =>
              p.hectares
                ? `${p.pasture.name} (${p.hectares} ha)`
                : p.pasture.name,
            )
            .join(", ") || null,
        Cultivo: t.crop,
        Productos:
          [
            ...t.products.map((p) => [p.productName, p.dosis, p.unit]),
            ...t.fertilizers.map((f) => [f.source, f.dosis, f.unit]),
          ]
            .map((parts) => parts.filter(Boolean).join(" "))
            .join(", ") || null,
        Animales:
          t.animals.map((a) => `${a.quantity} ${a.animalType}`).join(", ") ||
          null,
        Responsable: t.responsible
          ? [t.responsible.name, t.responsible.lastname]
              .filter(Boolean)
              .join(" ")
          : null,
        Contratista: t.contractor,
        Descripción: t.description,
      })),
    },
  ];
}

async function datos(tenantId: string): Promise<Sheet[]> {
  const records = await listTenantRecordsWithAuthor(tenantId);
  return [
    {
      name: "Datos",
      columns: [
        "Fecha",
        "Tipo",
        "Descripción",
        "Origen",
        "Cargado por",
        "Mensaje original",
      ],
      rows: records.map((r) => ({
        Fecha: argentinaDay(r.occurredAt),
        Tipo: getRecordConfig(r.type, r.data).label,
        Descripción: formatRecordDescription(r),
        Origen: formatRecordSource(r.source),
        "Cargado por": r.authorName,
        "Mensaje original": r.rawMessage,
      })),
    },
  ];
}

async function economia(tenantId: string, params: URLSearchParams): Promise<Sheet[]> {
  const overview = await getEconomyOverview(tenantId, params.get("season") || undefined);
  const day = (iso: string | null) => (iso ? { day: iso } : null);
  return [
    {
      name: "Campañas",
      columns: ["Ciclo", "Lote", "Cultivo", "Estado", "Hectáreas", "Siembra", "Costos directos (US$)", "Costo por ha (US$)", "Cosechado (kg)", "Rinde (kg/ha)", "Ingresos (US$)", "Ingreso estimado", "Margen bruto (US$)", "Margen por ha (US$)", "Precio (US$/t)", "Rinde de indiferencia (kg/ha)"],
      rows: overview.campaigns.map((c) => ({
        Ciclo: c.season,
        Lote: c.pastureName,
        Cultivo: c.crop,
        Estado: CAMPAIGN_STATUS_LABEL[c.status],
        Hectáreas: c.hectares,
        Siembra: day(c.sowingDate),
        "Costos directos (US$)": c.result.costUsd,
        "Costo por ha (US$)": c.result.costPerHaUsd,
        "Cosechado (kg)": c.harvestedKg,
        "Rinde (kg/ha)": c.result.yieldKgHa,
        "Ingresos (US$)": c.result.incomeUsd,
        "Ingreso estimado": c.result.estimated ? "Sí (precio de referencia)" : "No",
        "Margen bruto (US$)": c.result.marginUsd,
        "Margen por ha (US$)": c.result.marginPerHaUsd,
        "Precio (US$/t)": c.result.priceUsdPerTon,
        "Rinde de indiferencia (kg/ha)": c.result.breakEvenYieldKgHa,
      })),
    },
    {
      name: "Costos e ingresos",
      columns: ["Fecha", "Campaña", "Tipo", "Concepto", "Monto", "Moneda", "Dólar usado", "US$", "$"],
      rows: overview.campaigns.flatMap((c) =>
        [...c.costs.map((l) => ({ ...l, kind: "Costo" })), ...c.incomes.map((l) => ({ ...l, kind: "Ingreso" }))].map((l) => ({
          Fecha: { day: l.date },
          Campaña: `${c.crop} ${c.season} · ${c.pastureName}`,
          Tipo: l.kind,
          Concepto: l.concept,
          Monto: l.amount,
          Moneda: l.currency,
          "Dólar usado": l.rate,
          "US$": l.usd,
          "$": l.ars,
        })),
      ),
    },
  ];
}

const MODULES: Record<
  string,
  {
    file: string;
    build: (tenantId: string, params: URLSearchParams) => Promise<Sheet[]>;
  }
> = {
  insumos: { file: "insumos", build: insumos },
  gastos: { file: "gastos", build: gastos },
  potreros: { file: "potreros", build: potreros },
  tareas: { file: "tareas", build: tareas },
  datos: { file: "datos", build: datos },
  economia: { file: "economia", build: economia },
};

/** Descarga de un módulo del campo activo como planilla de Excel. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params;
  const target = MODULES[module];
  if (!target) return new Response("Módulo desconocido", { status: 404 });

  let buffer: Buffer;
  try {
    const tenantId = await requireActiveTenantId();
    buffer = buildWorkbook(
      await target.build(tenantId, new URL(request.url).searchParams),
    );
  } catch (error) {
    if (error instanceof AppError)
      return new Response(error.message, { status: 400 });
    throw error;
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="agrodata-${target.file}-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
