import { describe, expect, it } from "vitest";
import {
  adpvAlerts,
  evaluateAlerts,
  expenseAlerts,
  idleLotAlerts,
  milkAlerts,
  overdueTaskAlerts,
  sanitaryAlerts,
  stockAlerts,
  type FieldAlertInput,
} from "./alert-rules";
import { DEFAULT_ALERT_SETTINGS, resolveAlertSettings } from "./alert-settings";

const TODAY = "2026-09-27";

describe("stock que se acaba", () => {
  const gasoil = { id: "g", name: "Gasoil", unit: "L", quantity: 84, minStock: null, consumedLast30: 420 };

  it("avisa si al ritmo del último mes no llega a los días de cobertura", () => {
    const [alert] = stockAlerts([gasoil], 14);
    expect(alert).toMatchObject({ key: "stock:g", severity: "warning", title: "Gasoil para 6 días" });
    expect(alert!.detail).toBe("Consumiste 420 L en los últimos 30 días (14 L por día); quedan 84 L.");
  });

  it("no avisa si alcanza, ni sin consumo y sin mínimo", () => {
    expect(stockAlerts([{ ...gasoil, quantity: 400 }], 14)).toEqual([]);
    expect(stockAlerts([{ ...gasoil, quantity: 0, consumedLast30: 0 }], 14)).toEqual([]);
  });

  it("sin stock o a 3 días es grave", () => {
    expect(stockAlerts([{ ...gasoil, quantity: 0 }], 14)[0]).toMatchObject({ severity: "critical", title: "Gasoil sin stock" });
    expect(stockAlerts([{ ...gasoil, quantity: 40 }], 14)[0]!.severity).toBe("critical");
  });

  it("con mínimo cargado avisa aunque no haya consumo, y lo menciona", () => {
    const [alert] = stockAlerts([{ ...gasoil, quantity: 90, minStock: 100, consumedLast30: 0 }], 14);
    expect(alert).toMatchObject({ title: "Gasoil debajo del mínimo", severity: "warning" });
    expect(alert!.detail).toBe("Quedan 90 L. El mínimo es 100 L.");
    // Si además se acaba, un solo aviso (el de cobertura) que menciona el mínimo.
    const both = stockAlerts([{ ...gasoil, minStock: 100 }], 14);
    expect(both).toHaveLength(1);
    expect(both[0]!.detail).toContain("El mínimo es 100 L.");
  });
});

describe("sanidad", () => {
  const task = (id: string, deadline: string) => ({ id, name: "Aftosa", deadline, pasture: "Potrero Norte" });

  it("vencida es grave; dentro de la anticipación, advertencia; más lejos, nada", () => {
    const alerts = sanitaryAlerts([task("a", "2026-09-20"), task("b", "2026-09-30"), task("c", "2026-10-20")], TODAY, 7);
    expect(alerts.map((a) => [a.key, a.severity, a.title])).toEqual([
      ["sanitary:a", "critical", "Aftosa: venció el 20/09"],
      ["sanitary:b", "warning", "Aftosa: vence el 30/09"],
    ]);
    expect(alerts[1]!.detail).toBe("Tratamiento sanitario pendiente en Potrero Norte, en 3 días.");
  });

  it("hoy dice «vence hoy»", () => {
    expect(sanitaryAlerts([task("a", TODAY)], TODAY, 7)[0]!.title).toBe("Aftosa: vence hoy");
  });
});

describe("tareas vencidas", () => {
  it("solo las de fecha pasada", () => {
    const alerts = overdueTaskAlerts(
      [
        { id: "a", name: "Pulverización", deadline: "2026-09-26", pasture: "Lote 3" },
        { id: "b", name: "Siembra", deadline: TODAY, pasture: null },
      ],
      TODAY,
    );
    expect(alerts).toEqual([
      {
        key: "task:a",
        kind: "TASKS",
        severity: "warning",
        title: "Pulverización en Lote 3: venció el 26/09",
        detail: "Tarea pendiente desde hace 1 día.",
      },
    ]);
  });
});

describe("aumento de peso", () => {
  const w = (day: string, averageKg: number) => ({ day, headCount: 50, averageKg });
  const group = (weighings: ReturnType<typeof w>[]) => [{ key: "g1", name: "Novillos · Lote 1", weighings }];

  it("avisa si cae más que el porcentaje", () => {
    // 0,90 kg/día y después 0,50 kg/día: cae 44 %.
    const [alert] = adpvAlerts(group([w("2026-07-29", 300), w("2026-08-28", 327), w("2026-09-27", 342)]), TODAY, 30);
    expect(alert).toMatchObject({ severity: "warning", title: "Novillos · Lote 1: el aumento diario cayó 44 %" });
    expect(alert!.detail).toBe("Pasó de 0,90 a 0,50 kg por día entre el 28/08 y el 27/09.");
  });

  it("perder peso es grave", () => {
    const [alert] = adpvAlerts(group([w("2026-07-29", 300), w("2026-08-28", 327), w("2026-09-27", 321)]), TODAY, 30);
    expect(alert).toMatchObject({ severity: "critical", title: "Novillos · Lote 1 pierde peso" });
  });

  it("no avisa con dos pesadas, con una caída chica ni con la última pesada vieja", () => {
    expect(adpvAlerts(group([w("2026-08-28", 327), w("2026-09-27", 342)]), TODAY, 30)).toEqual([]);
    expect(adpvAlerts(group([w("2026-07-29", 300), w("2026-08-28", 327), w("2026-09-27", 351)]), TODAY, 30)).toEqual([]);
    expect(adpvAlerts(group([w("2026-04-01", 300), w("2026-05-01", 327), w("2026-06-01", 321)]), TODAY, 30)).toEqual([]);
  });
});

describe("litros por vaca", () => {
  const week = (from: number, count: number, liters: number) =>
    Array.from({ length: count }, (_, i) => {
      const day = new Date(Date.parse(`${TODAY}T12:00:00Z`) - (from + i) * 86_400_000).toISOString().slice(0, 10);
      return { day, liters, cowsMilking: 100 };
    });

  it("avisa si la última semana cae más que el porcentaje", () => {
    const [alert] = milkAlerts([...week(0, 7, 2100), ...week(7, 7, 2400)], TODAY, 10);
    expect(alert).toMatchObject({ key: "milk", title: "Litros por vaca: bajaron 13 %" });
    expect(alert!.detail).toBe("De 24,0 a 21,0 litros por vaca por día (últimos 7 días contra los 7 anteriores).");
  });

  it("no avisa con pocos días cargados ni con una caída chica", () => {
    expect(milkAlerts([...week(0, 4, 2100), ...week(7, 7, 2400)], TODAY, 10)).toEqual([]);
    expect(milkAlerts([...week(0, 7, 2300), ...week(7, 7, 2400)], TODAY, 10)).toEqual([]);
  });
});

describe("gastos fuera de lo normal", () => {
  const e = (month: string, amount: number, currency: "ARS" | "USD" = "ARS", categoryId = "comb") => ({
    categoryId,
    category: categoryId === "comb" ? "Combustible" : "Semillas",
    currency,
    month,
    amount,
  });

  it("avisa si el mes supera el factor del promedio de los 3 anteriores", () => {
    const [alert] = expenseAlerts([e("2026-06", 500_000), e("2026-07", 600_000), e("2026-08", 580_000), e("2026-09", 1_200_000)], "2026-09", 1.5);
    expect(alert).toMatchObject({ severity: "info", title: "Combustible: 2,1 veces lo normal en septiembre" });
    expect(alert!.detail).toBe("$ 1.200.000 en septiembre, contra un promedio de $ 560.000 entre junio y agosto.");
  });

  it("no avisa en categorías de temporada (sin gastos en alguno de los 3 meses)", () => {
    expect(expenseAlerts([e("2026-06", 100, "ARS", "sem"), e("2026-08", 100, "ARS", "sem"), e("2026-09", 900, "ARS", "sem")], "2026-09", 1.5)).toEqual([]);
  });

  it("pesos y dólares por separado", () => {
    const alerts = expenseAlerts(
      [e("2026-06", 100, "USD"), e("2026-07", 100, "USD"), e("2026-08", 100, "USD"), e("2026-09", 120, "USD"), e("2026-09", 999_999)],
      "2026-09",
      1.5,
    );
    expect(alerts).toEqual([]);
  });

  it("cruza el cambio de año", () => {
    expect(expenseAlerts([e("2025-10", 100), e("2025-11", 100), e("2025-12", 100), e("2026-01", 400)], "2026-01", 1.5)).toHaveLength(1);
  });
});

describe("lotes sin labores", () => {
  const lot = (labors: { day: string; label: string }[], startDay = "2026-07-01") => ({ id: "c1", name: "Soja 26/27 en Norte", startDay, labors });

  it("cuenta desde la última labor y dice cuál fue", () => {
    const [alert] = idleLotAlerts([lot([{ day: "2026-08-10", label: "pulverización" }, { day: "2026-07-20", label: "contratista" }])], TODAY, 30);
    expect(alert).toMatchObject({ key: "idle-lot:c1", kind: "IDLE_LOT", severity: "info", title: "Soja 26/27 en Norte: 48 días sin labores" });
    expect(alert!.detail).toBe("La última que se cargó fue pulverización, el 10/08.");
  });

  it("sin labores, cuenta desde la siembra; con el doble de días pide atención", () => {
    const [alert] = idleLotAlerts([lot([], "2026-07-01")], TODAY, 30);
    expect(alert!.severity).toBe("warning");
    expect(alert!.detail).toContain("Desde la siembra del 01/07");
  });

  it("con una labor reciente, una siembra futura o antes del umbral, no avisa", () => {
    expect(idleLotAlerts([lot([{ day: "2026-09-10", label: "fertilización" }])], TODAY, 30)).toEqual([]);
    expect(idleLotAlerts([lot([], "2026-10-15")], TODAY, 30)).toEqual([]);
    expect(idleLotAlerts([lot([], "2026-09-01")], TODAY, 30)).toEqual([]);
  });

  it("no toma labores de antes de la siembra ni con fecha futura", () => {
    const old = lot([{ day: "2026-03-01", label: "cosecha anterior" }, { day: "2026-12-01", label: "tarea a futuro" }], "2026-08-01");
    expect(idleLotAlerts([old], TODAY, 30)[0]!.detail).toContain("Desde la siembra del 01/08");
  });
});

describe("todo junto", () => {
  const input: FieldAlertInput = {
    today: TODAY,
    supplies: [{ id: "g", name: "Gasoil", unit: "L", quantity: 84, minStock: null, consumedLast30: 420 }],
    sanitaryTasks: [{ id: "a", name: "Aftosa", deadline: "2026-09-20", pasture: null }],
    otherTasks: [],
    idleLots: [],
    weighingGroups: [],
    milkDays: [],
    monthlyExpenses: [],
  };

  it("ordena de lo más grave a lo más leve y respeta lo apagado", () => {
    expect(evaluateAlerts(input, DEFAULT_ALERT_SETTINGS).map((a) => a.key)).toEqual(["sanitary:a", "stock:g"]);
    const noSanitary = { ...DEFAULT_ALERT_SETTINGS, enabled: { ...DEFAULT_ALERT_SETTINGS.enabled, SANITARY: false } };
    expect(evaluateAlerts(input, noSanitary).map((a) => a.key)).toEqual(["stock:g"]);
  });
});

describe("configuración", () => {
  it("lo que falta o es inválido toma el valor por defecto", () => {
    expect(resolveAlertSettings(null)).toEqual(DEFAULT_ALERT_SETTINGS);
    const settings = resolveAlertSettings({ enabled: { MILK: false }, stockCoverageDays: 21, adpvDropPct: 500 });
    expect(settings.enabled.MILK).toBe(false);
    expect(settings.enabled.STOCK).toBe(true);
    expect(settings.stockCoverageDays).toBe(21);
    expect(settings.adpvDropPct).toBe(30);
    expect(settings.enabled.IDLE_LOT).toBe(true);
    expect(settings.idleLotDays).toBe(30);
    expect(resolveAlertSettings({ idleLotDays: 3 }).idleLotDays).toBe(30);
  });
});
