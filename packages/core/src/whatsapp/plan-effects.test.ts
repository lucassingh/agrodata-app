import { describe, expect, it } from "vitest";
import type { FarmEvent } from "./farm-event";
import { confirmationQuestion, planMessageEffects, resultMessage, type TenantCatalog } from "./plan-effects";

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
    ]);
  });

  it("propone crear el potrero con las hectáreas sembradas", () => {
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "Soja", potrero: "La Loma", hectareas: 60 }), catalog, NOW);
    expect(plan.creations).toEqual([{ key: "pasture:la loma", kind: "pasture", name: "La Loma", hectares: 60 }]);
  });

  it("no duplica un cultivo que el potrero ya tiene", () => {
    const plan = planMessageEffects(event({ type: "SEEDING", cultivo: "maiz", potrero: "Potrero Norte" }), catalog, NOW);
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
    expect(plan.effects).toEqual([]);
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
    expect(plan.effects).toEqual([]);
    expect(plan.notes).toEqual([]);
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
