import "server-only";
import { prisma } from "@repo/database";
import { OUTFLOW_TYPES, restDays } from "../pastures/herd";
import { dateOnlyRangeFilter, dateRangeFilter } from "../reports/date-range";
import { normalizeEntityName } from "../whatsapp/entity-name";

/** Lecturas que usa el bot para contestar preguntas. Solo lectura, siempre
 *  acotadas al campo, con topes de detalle para no mandarle a Claude miles de
 *  filas. Devuelven objetos planos listos para serializar. */

interface Period {
  desde: string;
  hasta: string;
}

const DETAIL_LIMIT = 40;

const matches = (text: string | null | undefined, needle: string | null) =>
  !needle || normalizeEntityName(text ?? "").includes(normalizeEntityName(needle));

const argentinaDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
const utcDay = (date: Date) => date.toISOString().slice(0, 10);
const round = (value: number) => Math.round(value * 100) / 100;

function addTo(map: Map<string, number>, key: string, value: number) {
  map.set(key, round((map.get(key) ?? 0) + value));
}

export function createFarmQueryHandlers(tenantId: string) {
  return {
    async stock_actual({ insumo }: { insumo: string | null }) {
      const supplies = await prisma.supply.findMany({ where: { tenantId }, include: { category: true } });
      return supplies
        .filter((s) => matches(s.name, insumo))
        .map((s) => ({
          insumo: s.name,
          categoria: s.category.name,
          cantidad: s.quantity,
          unidad: s.unit,
          costoUnitario: s.cost,
          moneda: s.cost !== null ? s.currency : null,
        }));
    },

    async movimientos_stock({ desde, hasta, insumo }: Period & { insumo: string | null }) {
      const movements = await prisma.stockMovement.findMany({
        where: { tenantId, source: { not: "INITIAL" }, date: dateRangeFilter({ from: desde, to: hasta }) },
        include: { supply: { select: { name: true, unit: true } }, pasture: { select: { name: true } } },
        orderBy: { date: "desc" },
      });
      const filtered = movements.filter((m) => matches(m.supply.name, insumo));

      const totals = new Map<string, { insumo: string; unidad: string | null; ingresos: number; consumos: number; costoConsumido: Record<string, number> }>();
      for (const m of filtered) {
        const entry = totals.get(m.supplyId) ?? { insumo: m.supply.name, unidad: m.supply.unit, ingresos: 0, consumos: 0, costoConsumido: {} };
        if (m.direction === "IN") entry.ingresos = round(entry.ingresos + m.quantity);
        else {
          entry.consumos = round(entry.consumos + m.quantity);
          if (m.unitCost !== null && m.currency) {
            entry.costoConsumido[m.currency] = round((entry.costoConsumido[m.currency] ?? 0) + m.quantity * m.unitCost);
          }
        }
        totals.set(m.supplyId, entry);
      }

      return {
        periodo: { desde, hasta },
        totalesPorInsumo: [...totals.values()],
        detalle: filtered.slice(0, DETAIL_LIMIT).map((m) => ({
          fecha: argentinaDay(m.date),
          insumo: m.supply.name,
          movimiento: m.direction === "IN" ? "ingreso" : "consumo",
          cantidad: m.quantity,
          unidad: m.supply.unit,
          potrero: m.pasture?.name ?? null,
        })),
        movimientosSinMostrar: Math.max(0, filtered.length - DETAIL_LIMIT),
      };
    },

    async gastos({ desde, hasta, categoria }: Period & { categoria: string | null }) {
      const expenses = await prisma.expense.findMany({
        where: { tenantId, date: dateOnlyRangeFilter({ from: desde, to: hasta }) },
        include: { category: true },
        orderBy: { date: "desc" },
      });
      const filtered = expenses.filter((e) => matches(e.category.name, categoria));

      const byCurrency = new Map<string, number>();
      const byCategory = new Map<string, number>();
      for (const e of filtered) {
        addTo(byCurrency, e.currency, e.amount);
        addTo(byCategory, `${e.category.name} (${e.currency})`, e.amount);
      }

      return {
        periodo: { desde, hasta },
        totalPorMoneda: Object.fromEntries(byCurrency),
        totalPorCategoria: Object.fromEntries(byCategory),
        detalle: filtered.slice(0, DETAIL_LIMIT).map((e) => ({
          fecha: utcDay(e.date),
          categoria: e.category.name,
          descripcion: e.description,
          monto: e.amount,
          moneda: e.currency,
        })),
        gastosSinMostrar: Math.max(0, filtered.length - DETAIL_LIMIT),
      };
    },

    async hacienda_actual() {
      const pastures = await prisma.pasture.findMany({ where: { tenantId }, include: { animals: true } });
      const byType = new Map<string, number>();
      pastures.forEach((p) => p.animals.forEach((a) => addTo(byType, a.animalType, a.quantity)));
      return {
        totalPorTipo: Object.fromEntries(byType),
        porPotrero: pastures
          .filter((p) => p.animals.length > 0)
          .map((p) => ({ potrero: p.name, animales: p.animals.map((a) => ({ tipo: a.animalType, cantidad: a.quantity })) })),
      };
    },

    async movimientos_hacienda({ desde, hasta }: Period) {
      const events = await prisma.livestockEvent.findMany({
        where: { tenantId, date: dateRangeFilter({ from: desde, to: hasta }) },
        include: { pasture: { select: { name: true } } },
        orderBy: { date: "desc" },
      });
      const byKind = new Map<string, number>();
      events.forEach((e) => addTo(byKind, `${e.type} ${e.animalType}`, e.quantity));
      return {
        periodo: { desde, hasta },
        tipos:
          "BIRTH=nacimiento, PURCHASE=compra, SALE=venta, DEATH=mortandad, TRANSFER_IN/OUT=traslado entre potreros, ADJUSTMENT_IN/OUT=corrección manual",
        totales: Object.fromEntries(byKind),
        detalle: events.slice(0, DETAIL_LIMIT).map((e) => ({
          fecha: argentinaDay(e.date),
          tipo: e.type,
          animal: e.animalType,
          cantidad: e.quantity,
          potrero: e.pasture?.name ?? null,
          kgTotales: e.totalKg,
          monto: e.amount,
          moneda: e.currency,
          contraparte: e.counterparty,
        })),
      };
    },

    async potreros() {
      const [pastures, outflows] = await Promise.all([
        prisma.pasture.findMany({ where: { tenantId }, include: { crops: true, animals: true } }),
        prisma.livestockEvent.groupBy({
          by: ["pastureId"],
          where: { tenantId, type: { in: [...OUTFLOW_TYPES] } },
          _max: { date: true },
        }),
      ]);
      const lastOutflow = new Map(outflows.map((o) => [o.pastureId, o._max.date]));
      const now = new Date();
      return pastures.map((p) => {
        const animals = p.animals.reduce((sum, a) => sum + a.quantity, 0);
        return {
          potrero: p.name,
          hectareas: p.hectares,
          cultivos: p.crops.map((c) => ({ cultivo: c.crop, hectareas: c.hectares })),
          animales: p.animals.map((a) => ({ tipo: a.animalType, cantidad: a.quantity })),
          diasDeDescanso: restDays(animals, lastOutflow.get(p.id) ?? null, now),
        };
      });
    },

    async tareas({ desde, hasta }: Period) {
      const tasks = await prisma.task.findMany({
        where: { tenantId, deadline: dateOnlyRangeFilter({ from: desde, to: hasta }) },
        include: { products: true, fertilizers: true, animals: true, pastures: { include: { pasture: true } } },
        orderBy: { deadline: "desc" },
        take: DETAIL_LIMIT,
      });
      return tasks.map((t) => ({
        fecha: utcDay(t.deadline),
        tipo: t.type,
        estado: t.status === "COMPLETED" ? "completada" : "pendiente",
        potreros: t.pastures.map((p) => p.pasture.name),
        cultivo: t.crop,
        productos: [...t.products.map((p) => p.productName), ...t.fertilizers.map((f) => f.source)],
        animales: t.animals.map((a) => `${a.quantity} ${a.animalType}`),
        descripcion: t.description,
      }));
    },

    async registros({ desde, hasta, texto }: Period & { texto: string | null }) {
      const records = await prisma.record.findMany({
        where: { tenantId, occurredAt: dateRangeFilter({ from: desde, to: hasta }) },
        orderBy: { occurredAt: "desc" },
        take: 500,
      });
      const summaryOf = (data: unknown) => {
        const summary = (data as Record<string, unknown> | null)?.summary;
        return typeof summary === "string" ? summary : null;
      };
      const filtered = records.filter((r) => matches(`${summaryOf(r.data) ?? ""} ${r.rawMessage ?? ""}`, texto));
      return {
        periodo: { desde, hasta },
        total: filtered.length,
        detalle: filtered.slice(0, DETAIL_LIMIT).map((r) => ({
          fecha: argentinaDay(r.occurredAt),
          tipo: r.type,
          resumen: summaryOf(r.data),
          mensajeOriginal: r.rawMessage,
        })),
      };
    },
  };
}
