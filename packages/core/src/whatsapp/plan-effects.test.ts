import { describe, expect, it } from "vitest";
import type { FarmEvent } from "./farm-event";
import { confirmationQuestion, describeEffect, planMessageEffects, resultMessage, type TenantCatalog } from "./plan-effects";

const NOW = new Date("2026-09-25T15:00:00Z");

const catalog: TenantCatalog = {
  expenseCategories: [{ id: "ec-fuel", name: "Combustible" }],
  supplyCategories: [{ id: "sc-fuel", name: "Combustible" }],
  supplies: [{ id: "s-gasoil", name: "Gasoil", unit: "L", quantity: 1000, categoryId: "sc-fuel" }],
  pastures: [
    {
      id: "p-norte",
      name: "Potrero Norte",
      hectares: 120,
      crops: [{ id: "c1", crop: "Maíz" }],
      animals: [{ id: "a1", animalType: "Novillos", quantity: 40 }],
    },
    { id: "p-bajo", name: "El Bajo", hectares: 80, crops: [], animals: [] },
  ],
  animalCategories: [{ id: "ac1", name: "Novillos" }, { id: "ac2", name: "Terneros" }],
  campaigns: [],
};

function event(overrides: Partial<FarmEvent>): FarmEvent {
  return {
    type: "EXPENSE_INVOICE",
    summary: "Evento de prueba",
    occurredAt: null,
    potrero: null,
    destinoPotrero: null,
    cultivo: null,
    hectareas: null,
    cantidad: null,
    unidad: null,
    item: null,
    producto: null,
    movimientoStock: "NINGUNO",
    kilos: null,
    monto: null,
    moneda: null,
    contraparte: null,
    dosis: null,
    categoria: null,
    ...overrides,
  };
}

describe("gastos", () => {
  it("carga el gasto en una categoría existente, sin crear nada", () => {
    const plan = planMessageEffects(
      event({ type: "FUEL_USAGE", summary: "Carga de gasoil", monto: 185000, categoria: "combustible" }),
      catalog,
      NOW,
    );
    expect(plan.creations).toEqual([]);
    expect(plan.effects).toEqual([
      {
        kind: "expense",
        categoryRef: { existingId: "ec-fuel" },
        categoryName: "Combustible",
        amount: 185000,
        currency: "ARS",
        date: "2026-09-25",
        description: "Carga de gasoil",
        pastureId: null,
        cropHint: null,
      },
    ]);
  });

  it("propone crear la categoría si no existe", () => {
    const plan = planMessageEffects(event({ type: "PURCHASE", monto: 1000, categoria: "Semillas" }), catalog, NOW);
    expect(plan.creations).toEqual([{ key: "expenseCategory:semillas", kind: "expenseCategory", name: "Semillas" }]);
  });

  it("sin monto no hay gasto; un evento de campo con monto tampoco es gasto", () => {
    expect(planMessageEffects(event({ type: "PURCHASE", categoria: "Semillas" }), catalog, NOW).effects).toEqual([]);
    expect(planMessageEffects(event({ type: "SALE", monto: 5000 }), catalog, NOW).effects).toEqual([]);
  });

  it("no repite el proveedor si el resumen ya lo nombra", () => {
    const plan = planMessageEffects(
      event({ monto: 10, categoria: "Combustible", summary: "Pago a Estación Venado", contraparte: "estacion venado" }),
      catalog,
      NOW,
    );
    expect(plan.effects[0]).toMatchObject({ description: "Pago a Estación Venado" });
  });
});

describe("stock", () => {
  it("una compra de un insumo existente suma stock en su unidad", () => {
    const plan = planMessageEffects(
      event({ type: "PURCHASE", producto: "gasoil", cantidad: 500, unidad: "litros", movimientoStock: "INGRESO" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toContainEqual({
      kind: "stock",
      supplyRef: { existingId: "s-gasoil" },
      supplyName: "Gasoil",
      direction: "in",
      quantity: 500,
      unit: "L",
      date: "2026-09-25",
      unitCost: null,
      currency: null,
      pastureId: null,
      cropHint: null,
    });
    expect(plan.notes).toEqual([]);
  });

  it("una compra con monto guarda el precio por unidad", () => {
    const plan = planMessageEffects(
      event({ type: "PURCHASE", producto: "Gasoil", cantidad: 500, unidad: "L", movimientoStock: "INGRESO", monto: 600000, moneda: "ARS" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toContainEqual(expect.objectContaining({ kind: "stock", unitCost: 1200, currency: "ARS" }));
  });

  it("un consumo en un potrero existente queda asociado a ese potrero", () => {
    const plan = planMessageEffects(
      event({ type: "FUEL_USAGE", producto: "Gasoil", cantidad: 200, unidad: "L", movimientoStock: "EGRESO", potrero: "potrero norte" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toContainEqual(
      expect.objectContaining({ kind: "stock", direction: "out", pastureId: "p-norte", unitCost: null }),
    );
  });

  it("una compra de un insumo nuevo propone crear el insumo y su categoría, y además el gasto", () => {
    const plan = planMessageEffects(
      event({
        type: "PURCHASE",
        producto: "Semilla de maíz",
        cantidad: 20,
        unidad: "bolsas",
        movimientoStock: "INGRESO",
        monto: 2400000,
        categoria: "Semillas",
      }),
      catalog,
      NOW,
    );
    expect(plan.creations.map((c) => c.key)).toEqual([
      "expenseCategory:semillas",
      "supplyCategory:semillas",
      "supply:semilla de maiz",
    ]);
    expect(plan.effects.map((e) => e.kind)).toEqual(["expense", "stock"]);
    expect(confirmationQuestion(plan)).toBe(
      "Para cargar esto tengo que crear la categoría de gasto «Semillas», la categoría de insumos «Semillas» y el insumo «Semilla de maíz» (en bolsas). ¿Lo creo? Respondé sí o no.",
    );
  });

  it("un egreso de un insumo que no existe no crea nada y avisa", () => {
    const plan = planMessageEffects(
      event({ type: "FUMIGATION", producto: "Glifosato", cantidad: 100, unidad: "L", movimientoStock: "EGRESO" }),
      catalog,
      NOW,
    );
    expect(plan.creations).toEqual([]);
    expect(plan.effects.some((e) => e.kind === "stock")).toBe(false);
    expect(plan.notes).toContain("No descontamos stock de «Glifosato»: no está cargado en Insumos.");
  });

  it("si la unidad no coincide no toca el stock y avisa", () => {
    const plan = planMessageEffects(
      event({ type: "FUEL_USAGE", producto: "Gasoil", cantidad: 3, unidad: "bidones", movimientoStock: "EGRESO" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("se lleva en L y el mensaje dice bidones");
  });

  it("un egreso mayor al stock avisa que queda en 0", () => {
    const plan = planMessageEffects(
      event({ type: "FUEL_USAGE", producto: "Gasoil", cantidad: 1500, unidad: "L", movimientoStock: "EGRESO" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toHaveLength(1);
    expect(plan.notes[0]).toBe("«Gasoil» quedó en 0: tenías 1.000 L y el mensaje descuenta 1.500 L.");
  });
});

describe("costos por lote", () => {
  it("un gasto que nombra un lote lleva el lote y el cultivo para asignarlo a su campaña", () => {
    const plan = planMessageEffects(
      event({ type: "EXPENSE_INVOICE", summary: "Contratista de siembra", monto: 800000, categoria: "Combustible", potrero: "potrero norte", cultivo: "Soja" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toContainEqual(expect.objectContaining({ kind: "expense", pastureId: "p-norte", cropHint: "Soja" }));
  });
});

describe("siembra", () => {
  it("agrega el cultivo al potrero existente", () => {
    const plan = planMessageEffects(
      event({ type: "SEEDING", cultivo: "Soja", potrero: "potrero norte", hectareas: 100, occurredAt: "2026-09-24" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([
      {
        kind: "addCrop",
        pastureRef: { existingId: "p-norte" },
        pastureName: "Potrero Norte",
        crop: "Soja",
        hectares: 100,
        startDate: "2026-09-24",
      },
      {
        kind: "openCampaign",
        pastureRef: { existingId: "p-norte" },
        pastureName: "Potrero Norte",
        crop: "Soja",
        season: "26/27",
        hectares: 100,
        sowingDate: "2026-09-24",
      },
    ]);
  });

  it("sin hectáreas en el mensaje, la campaña toma las del lote", () => {
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "Soja", potrero: "El Bajo", occurredAt: "2026-10-02" }), catalog, NOW);
    expect(plan.effects).toContainEqual(expect.objectContaining({ kind: "openCampaign", hectares: 80, season: "26/27" }));
  });

  it("volver a sembrar un cultivo que el lote ya tiene abre la campaña del ciclo nuevo", () => {
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "maiz", potrero: "Potrero Norte" }), catalog, NOW);
    expect(plan.effects.map((e) => e.kind)).toEqual(["openCampaign"]);
    expect(plan.notes).toEqual([]);
  });

  it("propone crear el potrero con las hectáreas sembradas", () => {
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "Soja", potrero: "La Loma", hectareas: 60 }), catalog, NOW);
    expect(plan.creations).toEqual([{ key: "pasture:la loma", kind: "pasture", name: "La Loma", hectares: 60 }]);
  });

  it("no duplica un cultivo que el potrero ya tiene con su campaña abierta", () => {
    const withCampaign: TenantCatalog = {
      ...catalog,
      campaigns: [{ id: "cp1", pastureId: "p-norte", crop: "Maíz", season: "26/27", status: "IN_PROGRESS", hectares: 120 }],
    };
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "maiz", potrero: "Potrero Norte" }), withCampaign, NOW);
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("ya tiene maiz cargado");
  });

  it("respeta el tope de 5 cultivos", () => {
    const full: TenantCatalog = {
      ...catalog,
      pastures: [
        { ...catalog.pastures[0]!, crops: ["A", "B", "C", "D", "E"].map((crop, i) => ({ id: `c${i}`, crop })) },
      ],
    };
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "Soja", potrero: "Potrero Norte" }), full, NOW);
    expect(plan.effects.map((e) => e.kind)).toEqual(["openCampaign"]);
    expect(plan.notes[0]).toContain("5 cultivos");
  });

  it("sin potrero no toca Potreros y avisa", () => {
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "Soja" }), catalog, NOW);
    expect(plan.effects).toEqual([]);
    expect(plan.notes).toHaveLength(1);
  });
});

describe("animales", () => {
  it("un nacimiento suma a la categoría existente", () => {
    const plan = planMessageEffects(
      event({ type: "ANIMAL_BIRTH", item: "terneros", cantidad: 3, potrero: "El Bajo" }),
      catalog,
      NOW,
    );
    expect(plan.creations).toEqual([]);
    expect(plan.effects).toEqual([
      {
        kind: "addAnimals",
        reason: "BIRTH",
        pastureRef: { existingId: "p-bajo" },
        pastureName: "El Bajo",
        animalType: "Terneros",
        quantity: 3,
        date: "2026-09-25",
        deal: null,
      },
    ]);
  });

  it("un nacimiento de una categoría nueva propone crearla", () => {
    const plan = planMessageEffects(
      event({ type: "ANIMAL_BIRTH", item: "Terneras", cantidad: 2, potrero: "El Bajo" }),
      catalog,
      NOW,
    );
    expect(plan.creations).toEqual([{ key: "animalCategory:terneras", kind: "animalCategory", name: "Terneras" }]);
  });

  it("mueve animales cuando alcanzan", () => {
    const plan = planMessageEffects(
      event({ type: "POTRERO_CHANGE", item: "novillos", cantidad: 25, potrero: "Potrero Norte", destinoPotrero: "el bajo" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([
      {
        kind: "moveAnimals",
        fromPastureId: "p-norte",
        fromPastureName: "Potrero Norte",
        toPastureRef: { existingId: "p-bajo" },
        toPastureName: "El Bajo",
        animalType: "Novillos",
        quantity: 25,
        date: "2026-09-25",
      },
    ]);
  });

  it("no mueve si no alcanzan, y avisa", () => {
    const plan = planMessageEffects(
      event({ type: "POTRERO_CHANGE", item: "Novillos", cantidad: 60, potrero: "Potrero Norte", destinoPotrero: "El Bajo" }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("hay 40 Novillos");
  });

  it("no acepta cantidades de animales no enteras", () => {
    const plan = planMessageEffects(event({ type: "ANIMAL_BIRTH", item: "Terneros", cantidad: 2.5, potrero: "El Bajo" }), catalog, NOW);
    expect(plan.effects).toEqual([]);
  });
});

describe("venta, mortandad y compra de hacienda", () => {
  it("una venta descuenta del potrero indicado y guarda los datos de la operación", () => {
    const plan = planMessageEffects(
      event({
        type: "SALE",
        item: "novillos",
        cantidad: 30,
        potrero: "Potrero Norte",
        kilos: 12600,
        monto: 25000000,
        contraparte: "Frigorífico Rafaela",
      }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([
      {
        kind: "removeAnimals",
        reason: "SALE",
        pastureId: "p-norte",
        pastureName: "Potrero Norte",
        animalType: "Novillos",
        quantity: 30,
        date: "2026-09-25",
        deal: { amount: 25000000, currency: "ARS", totalKg: 12600, counterparty: "Frigorífico Rafaela" },
      },
    ]);
  });

  it("sin potrero usa el único que tiene esos animales", () => {
    const plan = planMessageEffects(event({ type: "ANIMAL_DEATH", item: "Novillos", cantidad: 1 }), catalog, NOW);
    expect(plan.effects[0]).toMatchObject({ kind: "removeAnimals", reason: "DEATH", pastureId: "p-norte", deal: null });
  });

  it("sin potrero y con varios candidatos no adivina", () => {
    const twoHerds: TenantCatalog = {
      ...catalog,
      pastures: [
        catalog.pastures[0]!,
        { ...catalog.pastures[1]!, animals: [{ id: "a2", animalType: "Novillos", quantity: 10 }] },
      ],
    };
    const plan = planMessageEffects(event({ type: "ANIMAL_DEATH", item: "Novillos", cantidad: 1 }), twoHerds, NOW);
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("varios potreros");
  });

  it("no descuenta más de lo que hay", () => {
    const plan = planMessageEffects(event({ type: "SALE", item: "Novillos", cantidad: 80, potrero: "Potrero Norte" }), catalog, NOW);
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("hay 40 Novillos");
  });

  it("una compra de hacienda suma animales y además genera el gasto", () => {
    const plan = planMessageEffects(
      event({ type: "PURCHASE", item: "Terneros", cantidad: 20, potrero: "El Bajo", monto: 9000000, categoria: "Hacienda" }),
      catalog,
      NOW,
    );
    expect(plan.effects.map((e) => e.kind)).toEqual(["expense", "addAnimals"]);
    expect(plan.effects[1]).toMatchObject({ reason: "PURCHASE", pastureName: "El Bajo", quantity: 20 });
  });

  it("una venta de granos no toca animales", () => {
    const plan = planMessageEffects(event({ type: "SALE", cultivo: "Soja", cantidad: 300, monto: 1000 }), catalog, NOW);
    expect(plan.effects.map((e) => e.kind)).toEqual(["grainSale"]);
  });
});

describe("tareas", () => {
  it("una pulverización crea la tarea completada y descuenta el producto", () => {
    const withGlifo: TenantCatalog = {
      ...catalog,
      supplies: [...catalog.supplies, { id: "s-glifo", name: "Glifosato", unit: "L", quantity: 300, categoryId: "sc" }],
    };
    const plan = planMessageEffects(
      event({
        type: "FUMIGATION",
        summary: "Pulverización con glifosato en Potrero Norte",
        potrero: "Potrero Norte",
        hectareas: 50,
        producto: "glifosato",
        dosis: "2 L/ha",
        cantidad: 100,
        unidad: "L",
        movimientoStock: "EGRESO",
      }),
      withGlifo,
      NOW,
    );
    expect(plan.effects.map((e) => e.kind)).toEqual(["stock", "task"]);
    expect(plan.effects[1]).toMatchObject({
      kind: "task",
      taskType: "PULVERIZACION",
      date: "2026-09-25",
      pastures: [{ ref: { existingId: "p-norte" }, name: "Potrero Norte", hectares: 50 }],
      products: [{ name: "glifosato", dosis: "2 L/ha", unit: "L" }],
    });
  });

  it("un tratamiento sanitario registra los animales sin crear categorías", () => {
    const plan = planMessageEffects(
      event({ type: "SANITARY_TREATMENT", item: "Vaquillonas", cantidad: 45, producto: "Vacuna aftosa" }),
      catalog,
      NOW,
    );
    expect(plan.creations).toEqual([]);
    expect(plan.effects[0]).toMatchObject({
      kind: "task",
      taskType: "TRATAMIENTO_SANITARIO",
      treatment: "Vacuna aftosa",
      animals: [{ animalType: "Vaquillonas", quantity: 45 }],
    });
  });
});

describe("resultMessage", () => {
  it("arma el mensaje con efectos y avisos", () => {
    expect(resultMessage("Compra de gasoil", ["Gasto de $ 10 en «Combustible»"], ["Ojo"])).toBe(
      "✅ Registrado: Compra de gasoil\n• Gasto de $ 10 en «Combustible»\n⚠️ Ojo",
    );
  });
});

describe("cosecha y venta de granos", () => {
  const withCampaigns: TenantCatalog = {
    ...catalog,
    campaigns: [
      { id: "cp-soja", pastureId: "p-norte", crop: "Soja", season: "25/26", status: "IN_PROGRESS", hectares: 100 },
      { id: "cp-maiz", pastureId: "p-bajo", crop: "Maíz", season: "25/26", status: "HARVESTED", hectares: 80 },
    ],
  };

  it("la cosecha en kg/ha se multiplica por las hectáreas de la campaña", () => {
    const plan = planMessageEffects(
      event({ type: "HARVEST", cultivo: "soja", potrero: "Potrero Norte", cantidad: 3200, unidad: "kg/ha" }),
      withCampaigns,
      NOW,
    );
    expect(plan.effects).toEqual([
      { kind: "harvest", campaignId: "cp-soja", campaignLabel: "Soja 25/26 de «Potrero Norte»", totalKg: 320000, date: "2026-09-25" },
    ]);
  });

  it("acepta quintales por hectárea", () => {
    const plan = planMessageEffects(
      event({ type: "HARVEST", cultivo: "Soja", potrero: "Potrero Norte", cantidad: 32, unidad: "qq/ha" }),
      withCampaigns,
      NOW,
    );
    expect(plan.effects).toContainEqual(expect.objectContaining({ kind: "harvest", totalKg: 320000 }));
  });

  it("sin campaña de ese cultivo en el lote, no inventa y avisa", () => {
    const plan = planMessageEffects(
      event({ type: "HARVEST", cultivo: "Trigo", potrero: "Potrero Norte", cantidad: 3000, unidad: "kg/ha" }),
      withCampaigns,
      NOW,
    );
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("No hay una campaña de Trigo");
  });

  it("la venta de granos va a la campaña cosechada de ese cultivo", () => {
    const plan = planMessageEffects(
      event({ type: "SALE", cultivo: "maiz", cantidad: 200, unidad: "t", monto: 40000, moneda: "USD", contraparte: "Acopio Sur" }),
      withCampaigns,
      NOW,
    );
    expect(plan.effects).toEqual([
      {
        kind: "grainSale",
        campaignId: "cp-maiz",
        campaignLabel: "Maíz 25/26 de «El Bajo»",
        crop: "maiz",
        quantityKg: 200000,
        amount: 40000,
        currency: "USD",
        counterparty: "Acopio Sur",
        date: "2026-09-25",
      },
    ]);
  });

  it("una venta de animales no es venta de granos", () => {
    const plan = planMessageEffects(
      event({ type: "SALE", item: "Novillos", cantidad: 5, potrero: "Potrero Norte", monto: 5000000 }),
      withCampaigns,
      NOW,
    );
    expect(plan.effects.some((e) => e.kind === "grainSale")).toBe(false);
  });

  it("con varias campañas posibles, el ingreso queda sin asignar y avisa", () => {
    const twoSoy: TenantCatalog = {
      ...withCampaigns,
      campaigns: [
        ...withCampaigns.campaigns,
        { id: "cp-soja2", pastureId: "p-bajo", crop: "Soja", season: "25/26", status: "IN_PROGRESS", hectares: 80 },
      ],
    };
    const plan = planMessageEffects(event({ type: "SALE", cultivo: "Soja", cantidad: 100, unidad: "t", monto: 30000, moneda: "USD" }), twoSoy, NOW);
    expect(plan.effects).toContainEqual(expect.objectContaining({ kind: "grainSale", campaignId: null }));
    expect(plan.notes[0]).toContain("asigná la venta desde Economía");
  });
});

describe("tambo", () => {
  it("los litros del día con las vacas en ordeño", () => {
    const plan = planMessageEffects(
      event({ type: "MILK_PRODUCTION", detail: { kind: "MILK_PRODUCTION", liters: 3200, cowsMilking: 140, cowsDry: null } }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([{ kind: "milkRecord", day: "2026-09-25", liters: 3200, cowsMilking: 140, cowsDry: null }]);
    expect(resultMessage("Producción del día", plan.effects.map(describeEffect), [])).toContain("Tambo: 3.200 L con 140 vacas (22,9 L/vaca)");
  });

  it("sin litros no carga nada y lo pide", () => {
    const plan = planMessageEffects(event({ type: "MILK_PRODUCTION", detail: null }), catalog, NOW);
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("cuántos litros");
  });

  it("la liquidación calcula el precio por litro si no viene", () => {
    const plan = planMessageEffects(
      event({
        type: "MILK_SETTLEMENT",
        detail: {
          kind: "MILK_SETTLEMENT",
          dairy: "La Serenísima",
          periodStart: "2026-09-01",
          periodEnd: "2026-09-15",
          liters: 45000,
          fatPct: 3.6,
          proteinPct: 3.3,
          pricePerLiter: null,
          totalAmount: 18_900_000,
          currency: "ARS",
        },
      }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([
      {
        kind: "milkSettlement",
        dairy: "La Serenísima",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-15",
        liters: 45000,
        fatPct: 3.6,
        proteinPct: 3.3,
        pricePerLiter: 420,
        totalAmount: 18_900_000,
        currency: "ARS",
      },
    ]);
  });
});

describe("pesadas", () => {
  it("una pesada por grupo en un potrero existente", () => {
    const plan = planMessageEffects(
      event({
        type: "WEIGHING",
        detail: { kind: "WEIGHING", groups: [{ pasture: "potrero norte", animalType: "novillos", headCount: 40, averageKg: 320 }] },
      }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([
      { kind: "weighing", pastureId: "p-norte", pastureName: "Potrero Norte", animalType: "Novillos", headCount: 40, averageKg: 320, day: "2026-09-25" },
    ]);
  });

  it("sin cabezas usa las que hay en el potrero", () => {
    const plan = planMessageEffects(
      event({ type: "WEIGHING", detail: { kind: "WEIGHING", groups: [{ pasture: "Potrero Norte", animalType: "Novillos", headCount: null, averageKg: 320 }] } }),
      catalog,
      NOW,
    );
    expect(plan.effects).toContainEqual(expect.objectContaining({ kind: "weighing", headCount: 40 }));
  });

  it("un potrero que no existe no se inventa", () => {
    const plan = planMessageEffects(
      event({ type: "WEIGHING", detail: { kind: "WEIGHING", groups: [{ pasture: "Corral 9", animalType: "Terneros", headCount: 10, averageKg: 150 }] } }),
      catalog,
      NOW,
    );
    expect(plan.effects).toEqual([]);
    expect(plan.notes[0]).toContain("No encontré el potrero «Corral 9»");
  });
});
