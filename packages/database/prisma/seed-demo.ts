/**
 * Cuenta demo (Etapa 6.5): un asesor con tres campos y datos creíbles, para las
 * capturas de la landing y para mostrar el producto. Solo para develop o local:
 * se niega a correr contra producción. Cada corrida borra y vuelve a crear la
 * demo, con fechas relativas a hoy.
 *
 *   pnpm --filter @repo/database db:seed:demo
 *
 * Entrás con demo@agrodata.dev / AgroDemo2026!
 */
import type { Prisma, RecordType, StockMovementSource } from "@prisma/client";
import { prisma } from "../src/index";
import { hashPassword } from "../src/password";

const PRODUCTION_HOST = "ep-lively-forest";
const DEMO_DOMAIN = "@demo.agrodata.dev";
const DEMO_EMAIL = "demo@agrodata.dev";
const DEMO_PASSWORD = "AgroDemo2026!";
const FIELD_NAMES = ["Estancia La Esperanza", "Campo Don Julio", "Tambo Los Álamos"];

// ── Fechas ───────────────────────────────────────────────────
const DAY_MS = 86_400_000;
const todayAr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const isoDay = (offset: number) => new Date(Date.parse(`${todayAr}T12:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
/** Un momento (registros, movimientos, pesadas, cosechas): mediodía argentino. */
const moment = (offset: number) => new Date(`${isoDay(offset)}T12:00:00-03:00`);
/** Un campo de solo fecha (gastos, vencimientos, tambo): medianoche UTC. */
const dateOnly = (offset: number) => new Date(`${isoDay(offset)}T00:00:00Z`);
/** Días desde hoy hasta una fecha fija (negativo si ya pasó). */
const offsetOf = (day: string) => Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${todayAr}T12:00:00Z`)) / DAY_MS);

async function reset() {
  const demoUsers = await prisma.user.findMany({
    where: { OR: [{ email: DEMO_EMAIL }, { email: { endsWith: DEMO_DOMAIN } }] },
    select: { id: true },
  });
  const ids = demoUsers.map((u) => u.id);
  if (ids.length) {
    const demoFields = { name: { in: FIELD_NAMES }, memberships: { some: { userId: { in: ids } } } };
    // Los insumos primero: su categoría no se puede borrar mientras tengan insumos.
    await prisma.supply.deleteMany({ where: { tenant: demoFields } });
    await prisma.tenant.deleteMany({ where: demoFields });
    await prisma.task.updateMany({ where: { responsibleId: { in: ids } }, data: { responsibleId: null } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes(PRODUCTION_HOST)) throw new Error("La cuenta demo no se crea en producción.");
  console.log("Base:", url.replace(/\/\/[^@]+@/, "//***@").split("?")[0]);

  await reset();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const person = (name: string, lastname: string, email: string, wNumber: string, extra: object = {}) =>
    prisma.user.create({
      data: {
        name,
        lastname,
        email,
        wNumber,
        passwordHash,
        subscription: { create: { trialEndsAt: moment(12) } },
        ...extra,
      },
    });

  const martin = await person("Martín", "Sosa", DEMO_EMAIL, "+5492325400100", {
    profileType: "AGRONOMO",
    profession: "Ing. Agrónomo",
    licenseNumber: "MP 4521",
  });
  await prisma.subscription.update({ where: { userId: martin.id }, data: { plan: "ASESOR", paidUntil: moment(330) } });
  const ricardo = await person("Ricardo", "Gómez", `ricardo${DEMO_DOMAIN}`, "+5492325400101", { profileType: "PRODUCTOR" });
  const lucia = await person("Lucía", "Pérez", `lucia${DEMO_DOMAIN}`, "+5492325400102", { profileType: "ADMINISTRATIVO" });
  const juan = await person("Juan", "Díaz", `juan${DEMO_DOMAIN}`, "+5492325400103");
  const pedro = await person("Pedro", "Ruiz", `pedro${DEMO_DOMAIN}`, "+5492325400104");
  const julio = await person("Julio", "Ferreyra", `julio${DEMO_DOMAIN}`, "+5492325400105", { profileType: "PRODUCTOR" });
  const ana = await person("Ana", "Beltrán", `ana${DEMO_DOMAIN}`, "+5492325400106", { profileType: "PRODUCTOR" });

  // ── Campos y equipo ────────────────────────────────────────
  const field = (name: string, activities: ("AGRICULTURA" | "GANADERIA" | "TAMBO")[], category: "MIXTO" | "FIELD_AGRICOLA" | "TAMBO", location: string, totalHa: number) =>
    prisma.tenant.create({ data: { name, activities, category, location, totalHa, exchangeRateKind: "MAYORISTA", vatCondition: "RESPONSABLE_INSCRIPTO" } });
  const esperanza = await field("Estancia La Esperanza", ["AGRICULTURA", "GANADERIA", "TAMBO"], "MIXTO", "San Antonio de Areco, Buenos Aires", 513);
  const donJulio = await field("Campo Don Julio", ["AGRICULTURA"], "FIELD_AGRICOLA", "Pergamino, Buenos Aires", 640);
  const alamos = await field("Tambo Los Álamos", ["TAMBO", "GANADERIA"], "TAMBO", "Rafaela, Santa Fe", 220);

  const member = (userId: string, tenantId: string, role: "OWNER" | "ADMIN" | "ADVISOR" | "USER_GENERAL", daysAgo: number) =>
    prisma.userTenantMembership.create({
      data: { userId, tenantId, role, status: "ACTIVE", invitedAt: moment(-daysAgo), acceptedAt: moment(-daysAgo), createdAt: moment(-daysAgo) },
    });
  await member(ricardo.id, esperanza.id, "OWNER", 210);
  await member(martin.id, esperanza.id, "ADVISOR", 200);
  await member(lucia.id, esperanza.id, "ADMIN", 190);
  await member(juan.id, esperanza.id, "USER_GENERAL", 180);
  await member(pedro.id, esperanza.id, "USER_GENERAL", 150);
  await member(julio.id, donJulio.id, "OWNER", 160);
  await member(martin.id, donJulio.id, "ADVISOR", 158);
  await member(ana.id, alamos.id, "OWNER", 120);
  await member(martin.id, alamos.id, "ADVISOR", 118);
  await prisma.user.update({ where: { id: martin.id }, data: { activeTenantId: esperanza.id } });

  await seedEsperanza(esperanza.id, { martin: martin.id, lucia: lucia.id, juan: juan.id, pedro: pedro.id });
  await seedDonJulio(donJulio.id, julio.id);
  await seedAlamos(alamos.id, ana.id);

  // La demo arranca con las guías vistas: las capturas no llevan el cartel.
  await prisma.tourSeen.createMany({
    data: ["inicio", "resumen", "cartera", "potreros", "tareas", "gastos", "insumos", "economia", "ganaderia", "tambo", "datos", "equipo", "preferencias"].map((tourId) => ({ userId: martin.id, tourId })),
  });

  console.log(`Listo. Entrás con ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

// ── Estancia La Esperanza: mixto, el campo de las capturas ────
async function seedEsperanza(tenantId: string, people: { martin: string; lucia: string; juan: string; pedro: string }) {
  for (const name of ["Vacas", "Terneros", "Novillos", "Vaquillonas", "Vacas en ordeñe", "Vacas secas"]) {
    await prisma.animalCategory.create({ data: { tenantId, name } });
  }
  for (const name of ["Soja", "Maíz", "Trigo", "Pastura"]) await prisma.cropConfig.create({ data: { tenantId, name } });
  const rodeo = await prisma.rodeo.create({ data: { tenantId, name: "Rodeo de cría", description: "Vacas Angus con servicio de primavera" } });

  const pasture = (name: string, hectares: number, crops: { crop: string; hectares: number; start?: number }[] = [], animals: { animalType: string; quantity: number; averageWeight?: number }[] = []) =>
    prisma.pasture.create({
      data: {
        tenantId,
        name,
        hectares,
        crops: { create: crops.map((c) => ({ crop: c.crop, hectares: c.hectares, startDate: c.start !== undefined ? moment(c.start) : null })) },
        animals: { create: animals },
      },
    });
  const norte = await pasture("Norte", 120, [{ crop: "Trigo", hectares: 120, start: offsetOf("2026-06-12") }]);
  const sur = await pasture("Sur", 95);
  const lote4 = await pasture("Lote 4", 80);
  const bajo = await pasture("Bajo", 110, [{ crop: "Pastura", hectares: 110 }], [
    { animalType: "Vacas", quantity: 85, averageWeight: 430 },
    { animalType: "Terneros", quantity: 64, averageWeight: 165 },
  ]);
  const corral = await pasture("Corral 1", 3, [], [{ animalType: "Novillos", quantity: 40, averageWeight: 386 }]);
  await pasture("Tambo", 105, [{ crop: "Pastura", hectares: 105 }], [
    { animalType: "Vacas en ordeñe", quantity: 138 },
    { animalType: "Vacas secas", quantity: 22 },
  ]);

  // ── Gastos (pesos, con un par en dólares) ──
  const colors: Record<string, string> = {
    Combustible: "#D97706",
    Semillas: "#2D6A4F",
    Agroquímicos: "#7C3AED",
    Contratistas: "#0E7490",
    Veterinaria: "#DB2777",
    Sueldos: "#475569",
    Reparaciones: "#B45309",
  };
  const cat: Record<string, string> = {};
  for (const [name, color] of Object.entries(colors)) {
    cat[name] = (await prisma.expenseCategory.create({ data: { tenantId, name, color } })).id;
  }
  const expense = (category: string, amount: number, daysAgo: number, description: string, currency: "ARS" | "USD" = "ARS", vatRate = 21) =>
    prisma.expense.create({ data: { tenantId, categoryId: cat[category]!, amount, currency, date: dateOnly(-daysAgo), description, withIva: true, vatRate } });

  for (const [monthsAgo, fuel, wages, vet, repairs] of [
    [4, 1_150_000, 3_900_000, 380_000, 260_000],
    [3, 980_000, 3_900_000, 420_000, 310_000],
    [2, 1_240_000, 4_150_000, 350_000, 240_000],
    [1, 1_080_000, 4_150_000, 460_000, 290_000],
  ] as const) {
    const base = monthsAgo * 30;
    await expense("Combustible", fuel, base - 3, "Gasoil para siembra y fumigación");
    await expense("Sueldos", wages, base - 25, "Sueldos del personal", "ARS", 0);
    await expense("Veterinaria", vet, base - 10, "Honorarios y vacunas", "ARS", 10.5);
    await expense("Reparaciones", repairs, base - 15, "Mantenimiento de maquinaria");
  }
  // Compras para la próxima siembra y el barbecho.
  await expense("Semillas", 22_400_000, 15, "Semilla de maíz DK 72-50 para el Sur", "ARS", 10.5);
  await expense("Agroquímicos", 3_150_000, 12, "Glifosato y atrazina para el barbecho");
  await expense("Contratistas", 1_850_000, 11, "Aplicación terrestre del barbecho en el Sur");
  await expense("Contratistas", 2_600_000, 36, "Fertilización del trigo en el Norte", "ARS", 10.5);

  // Mes en curso: una reparación grande dispara el aviso de gasto fuera de lo normal.
  const dayOfMonth = Number(todayAr.slice(8, 10));
  await expense("Reparaciones", 1_180_000, Math.min(4, dayOfMonth - 1), "Cambio de embrague del tractor");
  await expense("Combustible", 640_000, Math.min(6, dayOfMonth - 1), "Gasoil para la siembra de maíz");

  // ── Insumos con historial ──
  const supplyCat = async (name: string, code: string) => (await prisma.supplyCategory.create({ data: { tenantId, name, code } })).id;
  const combustibles = await supplyCat("Combustibles", "INSUMOS_AGRICOLAS");
  const agroquimicos = await supplyCat("Agroquímicos", "INSUMOS_AGRICOLAS");
  const fertilizantes = await supplyCat("Fertilizantes", "FERTILIZANTES");
  const sanidad = await supplyCat("Sanidad", "SANIDAD");
  const alimento = await supplyCat("Alimento", "ALIMENTO");

  /** Un insumo con su historial: arranca con `initial` hace 60 días y aplica los movimientos. */
  const supply = async (
    name: string,
    categoryId: string,
    unit: string,
    cost: number,
    supplier: string,
    initial: number,
    moves: { daysAgo: number; qty: number; pastureId?: string; source?: StockMovementSource }[],
    minStock?: number,
    vatRate = 21,
  ) => {
    let balance = initial;
    const history: Omit<Prisma.StockMovementUncheckedCreateInput, "tenantId" | "supplyId">[] = [
      { direction: "IN", quantity: initial, balance, unitCost: cost, source: "INITIAL", date: moment(-60) },
    ];
    for (const m of [...moves].sort((a, b) => b.daysAgo - a.daysAgo)) {
      balance += m.qty;
      history.push({
        direction: m.qty >= 0 ? "IN" : "OUT",
        quantity: Math.abs(m.qty),
        balance,
        unitCost: cost,
        source: m.source ?? "WHATSAPP",
        date: moment(-m.daysAgo),
        pastureId: m.pastureId,
      });
    }
    const created = await prisma.supply.create({
      data: { tenantId, categoryId, name, unit, cost, supplier, vatRate, minStock, quantity: balance, currency: "ARS" },
    });
    for (const h of history) await prisma.stockMovement.create({ data: { tenantId, supplyId: created.id, currency: "ARS", ...h } });
    return created;
  };
  // Gasoil: al ritmo del último mes alcanza para unos días (aviso de stock).
  await supply("Gasoil", combustibles, "L", 1_250, "YPF Agro Areco", 5_000, [
    { daysAgo: 40, qty: -900 },
    { daysAgo: 27, qty: -1_100, pastureId: sur.id },
    { daysAgo: 18, qty: -950, pastureId: sur.id },
    { daysAgo: 9, qty: -700 },
    { daysAgo: 3, qty: -650, pastureId: sur.id },
  ]);
  await supply("Glifosato 66%", agroquimicos, "L", 9_800, "Agroservicios del Norte", 400, [
    { daysAgo: 20, qty: -190, pastureId: sur.id },
    { daysAgo: 8, qty: 200, source: "MANUAL" },
  ]);
  await supply("Atrazina 90%", agroquimicos, "kg", 14_500, "Agroservicios del Norte", 150, [{ daysAgo: 11, qty: -95, pastureId: sur.id }]);
  await supply("Urea granulada", fertilizantes, "kg", 1_050, "Profertil", 12_000, [{ daysAgo: 35, qty: -9_600, pastureId: norte.id }], 3_000, 10.5);
  await supply("Vacuna aftosa", sanidad, "dosis", 1_900, "Biogénesis Bagó", 400, [{ daysAgo: 45, qty: -150 }], 100, 10.5);
  await supply("Ivermectina 1%", sanidad, "L", 58_000, "Veterinaria San Martín", 6, [{ daysAgo: 30, qty: -2 }], undefined, 10.5);
  await supply("Balanceado tambo 18%", alimento, "kg", 420, "Alimentos Pilar", 30_000, [
    { daysAgo: 28, qty: -5_600 },
    { daysAgo: 21, qty: -5_600 },
    { daysAgo: 14, qty: -5_500 },
    { daysAgo: 7, qty: -5_600 },
    { daysAgo: 5, qty: 20_000, source: "MANUAL" },
  ], undefined, 10.5);

  // ── Tareas ──
  const task = (data: Omit<Prisma.TaskUncheckedCreateInput, "tenantId">) => prisma.task.create({ data: { tenantId, ...data } });
  await task({
    type: "TRATAMIENTO_SANITARIO",
    status: "PENDING",
    deadline: dateOnly(4),
    treatment: "Vacunación aftosa",
    responsibleId: people.lucia,
    products: { create: [{ productName: "Vacuna aftosa", dosis: "2", unit: "ml" }] },
    pastures: { create: [{ pastureId: bajo.id }] },
    animals: { create: [{ animalType: "Terneros", quantity: 64 }] },
  });
  await task({
    type: "PULVERIZACION",
    status: "PENDING",
    deadline: dateOnly(-2),
    crop: "Barbecho",
    contractor: "Servicios Agrícolas Areco",
    responsibleId: people.juan,
    products: { create: [{ productName: "Glifosato 66%", dosis: "2", unit: "L/ha" }] },
    pastures: { create: [{ pastureId: lote4.id, hectares: "80" }] },
  });
  await task({
    type: "FERTILIZACION",
    status: "PENDING",
    deadline: dateOnly(9),
    crop: "Trigo",
    responsibleId: people.juan,
    fertilizers: { create: [{ source: "Urea granulada", dosis: "100", unit: "kg/ha" }] },
    pastures: { create: [{ pastureId: norte.id, hectares: "120" }] },
  });
  await task({
    type: "ORDEN_SIEMBRA",
    status: "PENDING",
    deadline: dateOnly(35),
    crop: "Soja",
    genetic: "DM 46R18 STS",
    density: "320000",
    densityUnit: "semillas/ha",
    spacing: "52 cm",
    contractor: "Servicios Agrícolas Areco",
    responsibleId: people.pedro,
    pastures: { create: [{ pastureId: lote4.id, hectares: "80" }] },
  });
  await task({
    type: "ORDEN_SIEMBRA",
    status: "PENDING",
    deadline: dateOnly(6),
    crop: "Maíz",
    genetic: "DK 72-50 VT3P",
    density: "80000",
    densityUnit: "semillas/ha",
    spacing: "52 cm",
    contractor: "Servicios Agrícolas Areco",
    responsibleId: people.pedro,
    pastures: { create: [{ pastureId: sur.id, hectares: "95" }] },
  });
  await task({
    type: "PULVERIZACION",
    status: "COMPLETED",
    deadline: dateOnly(-11),
    crop: "Barbecho",
    responsibleId: people.juan,
    products: { create: [{ productName: "Glifosato 66%", dosis: "2", unit: "L/ha" }, { productName: "Atrazina 90%", dosis: "1", unit: "kg/ha" }] },
    pastures: { create: [{ pastureId: sur.id, hectares: "95" }] },
  });
  await task({
    type: "TRATAMIENTO_SANITARIO",
    status: "COMPLETED",
    deadline: dateOnly(-30),
    treatment: "Desparasitación",
    responsibleId: people.lucia,
    products: { create: [{ productName: "Ivermectina 1%", dosis: "1", unit: "ml/50kg" }] },
    pastures: { create: [{ pastureId: corral.id }] },
    animals: { create: [{ animalType: "Novillos", quantity: 40 }] },
  });

  // ── Hacienda: pesadas y reproducción ──
  const weighing = (pastureId: string, animalType: string, daysAgo: number, headCount: number, averageKg: number, rodeoId?: string) =>
    prisma.weighing.create({ data: { tenantId, pastureId, animalType, date: moment(-daysAgo), headCount, averageKg, source: "WHATSAPP", rodeoId } });
  await weighing(corral.id, "Novillos", 64, 40, 318);
  await weighing(corral.id, "Novillos", 33, 40, 352);
  await weighing(corral.id, "Novillos", 2, 40, 386);
  await weighing(bajo.id, "Terneros", 58, 64, 118, rodeo.id);
  await weighing(bajo.id, "Terneros", 5, 64, 165, rodeo.id);
  const repro = (type: "SERVICE_START" | "PREGNANCY_CHECK" | "WEANING", day: string, data: object) =>
    prisma.reproEvent.create({ data: { tenantId, rodeoId: rodeo.id, animalType: "Vacas", type, date: moment(offsetOf(day)), ...data } });
  await repro("SERVICE_START", "2025-11-15", { females: 90 });
  await repro("PREGNANCY_CHECK", "2026-03-20", { females: 90, pregnant: 81, empty: 9 });
  await prisma.livestockEvent.create({ data: { tenantId, pastureId: bajo.id, type: "BIRTH", animalType: "Terneros", quantity: 76, date: moment(offsetOf("2026-08-25")) } });
  await prisma.livestockEvent.create({ data: { tenantId, pastureId: corral.id, type: "PURCHASE", animalType: "Novillos", quantity: 40, date: moment(-70), totalKg: 12_400, amount: 49_600_000, currency: "ARS", counterparty: "Remate Feria Areco" } });

  // ── Tambo: 28 días de litros y una liquidación ──
  for (let d = 28; d >= 1; d--) {
    const wave = Math.sin(d / 3) * 90;
    await prisma.milkRecord.create({
      data: { tenantId, date: dateOnly(-d), liters: Math.round(3_180 + (28 - d) * 6 + wave), cowsMilking: 138, cowsDry: 22 },
    });
  }
  await prisma.milkSettlement.create({
    data: {
      tenantId,
      periodStart: dateOnly(-45),
      periodEnd: dateOnly(-16),
      dairy: "La Serenísima",
      liters: 95_400,
      fatPct: 3.6,
      proteinPct: 3.3,
      pricePerLiter: 435,
      totalAmount: 41_499_000,
    },
  });

  // ── Economía por lote ──
  const usd = (campaignId: string, amount: number, day: string, concept: string) =>
    prisma.costAllocation.create({ data: { tenantId, campaignId, amount, currency: "USD", vatRate: 10.5, date: moment(offsetOf(day)), concept } });
  const soja = await prisma.campaign.create({
    data: { tenantId, pastureId: lote4.id, crop: "Soja", season: "25/26", hectares: 80, sowingDate: moment(offsetOf("2025-11-14")), status: "HARVESTED", referencePrice: 300 },
  });
  for (const [amount, day, concept] of [
    [5_600, "2025-11-10", "Semilla DM 46R18 STS"],
    [4_000, "2025-11-14", "Siembra (contratista)"],
    [6_900, "2025-12-05", "Herbicidas y fungicida"],
    [3_200, "2026-01-20", "Insecticida y aplicación"],
    [6_400, "2026-04-18", "Cosecha (contratista)"],
    [4_800, "2026-05-08", "Flete a puerto"],
  ] as const) await usd(soja.id, amount, day, concept);
  await prisma.harvest.create({ data: { tenantId, campaignId: soja.id, date: moment(offsetOf("2026-04-18")), totalKg: 268_000, moisture: 13 } });
  await prisma.income.create({
    data: { tenantId, campaignId: soja.id, type: "GRAIN_SALE", date: moment(offsetOf("2026-05-08")), crop: "Soja", quantityKg: 268_000, amount: 80_400, currency: "USD", counterparty: "ACA" },
  });

  const maizViejo = await prisma.campaign.create({
    data: { tenantId, pastureId: sur.id, crop: "Maíz", season: "25/26", hectares: 95, sowingDate: moment(offsetOf("2025-09-22")), status: "HARVESTED", referencePrice: 185 },
  });
  for (const [amount, day, concept] of [
    [14_300, "2025-09-18", "Semilla DK 72-50"],
    [5_200, "2025-09-22", "Siembra (contratista)"],
    [19_950, "2025-10-15", "Urea y fosfato"],
    [8_100, "2025-11-10", "Herbicidas"],
    [8_550, "2026-03-28", "Cosecha (contratista)"],
    [12_600, "2026-04-15", "Flete a puerto"],
  ] as const) await usd(maizViejo.id, amount, day, concept);
  await prisma.harvest.create({ data: { tenantId, campaignId: maizViejo.id, date: moment(offsetOf("2026-03-28")), totalKg: 836_000, moisture: 14.5 } });
  await prisma.income.create({
    data: { tenantId, campaignId: maizViejo.id, type: "GRAIN_SALE", date: moment(offsetOf("2026-04-15")), crop: "Maíz", quantityKg: 836_000, amount: 154_660, currency: "USD", counterparty: "Cargill" },
  });

  const trigo = await prisma.campaign.create({
    data: { tenantId, pastureId: norte.id, crop: "Trigo", season: "25/26", hectares: 120, sowingDate: moment(offsetOf("2026-06-12")), status: "IN_PROGRESS", referencePrice: 210 },
  });
  for (const [amount, day, concept] of [
    [9_600, "2026-06-08", "Semilla Baguette 620"],
    [5_400, "2026-06-12", "Siembra (contratista)"],
    [10_080, "2026-08-24", "Urea granulada"],
  ] as const) await usd(trigo.id, amount, day, concept);

  // ── Registros: lo que llegó por WhatsApp y por la web ──
  const record = (type: RecordType, daysAgo: number, summary: string, userId: string, source = "WHATSAPP", rawMessage?: string) =>
    prisma.record.create({
      data: { tenantId, type, occurredAt: moment(-daysAgo), data: { summary }, source, confidence: source === "WHATSAPP" ? 0.94 : null, rawMessage: rawMessage ?? summary, userId, createdAt: moment(-daysAgo) },
    });
  await record("FUEL_USAGE", 3, "Consumo de 650 L de gasoil en las labores del Sur", people.pedro, "WHATSAPP", "cargué 650 litros de gasoil en el tractor, lote sur");
  await record("WEIGHING", 2, "Pesada de 40 novillos del Corral 1: promedio 386 kg", people.juan, "WHATSAPP", "pesamos los 40 novillos del corral 1, promedio 386");
  await record("MILK_PRODUCTION", 1, "Tambo: 3.340 litros con 138 vacas en ordeñe", people.lucia, "WHATSAPP", "hoy 3340 litros, 138 vacas en ordeñe");
  await record("EXPENSE_INVOICE", 4, "Factura de Taller Rural: cambio de embrague del tractor, $1.180.000", people.lucia, "WHATSAPP", "[foto de factura]");
  await record("FUMIGATION", 11, "Barbecho químico en el Sur: glifosato 2 L/ha y atrazina 1 kg/ha, 95 ha", people.juan, "WHATSAPP", "terminamos el barbecho del sur, glifo 2 litros y atrazina 1 kilo");
  await record("SALE", offsetOf("2026-05-08") * -1, "Venta de 268 t de soja del Lote 4 a ACA, US$ 80.400", people.martin, "WEB");
  await record("SALE", offsetOf("2026-04-15") * -1, "Venta de 836 t de maíz del Sur a Cargill, US$ 154.660", people.martin, "WEB");
  await record("ANIMAL_BIRTH", 35, "Nacieron 76 terneros en el Bajo", people.juan, "WHATSAPP", "van 76 terneros nacidos en el bajo");
  await record("PURCHASE", 8, "Compra de 200 L de glifosato a Agroservicios del Norte", people.martin, "WEB");
  await record("SANITARY_TREATMENT", 30, "Desparasitación de 40 novillos con ivermectina", people.lucia, "WHATSAPP", "desparasitamos los novillos del corral con ivermectina");
  await record("MILK_SETTLEMENT", 16, "Liquidación de La Serenísima: 95.400 L a $435", people.lucia, "WHATSAPP", "[foto de la liquidación]");
}

// ── Campo Don Julio: agrícola ──────────────────────────────────
async function seedDonJulio(tenantId: string, ownerId: string) {
  const potrero = async (name: string, hectares: number, crop?: string) =>
    prisma.pasture.create({ data: { tenantId, name, hectares, crops: crop ? { create: [{ crop, hectares }] } : undefined } });
  const lote1 = await potrero("Lote 1", 220);
  await potrero("Lote 2", 180, "Trigo");
  await potrero("Lote 3", 240);
  const combustible = await prisma.expenseCategory.create({ data: { tenantId, name: "Combustible", color: "#D97706" } });
  await prisma.expense.create({ data: { tenantId, categoryId: combustible.id, amount: 2_350_000, currency: "ARS", date: dateOnly(-6), description: "Gasoil para el barbecho", vatRate: 21 } });
  await prisma.task.create({
    data: { tenantId, type: "ORDEN_SIEMBRA", status: "PENDING", deadline: dateOnly(8), crop: "Maíz", genetic: "DK 72-50 VT3P", pastures: { create: [{ pastureId: lote1.id, hectares: "220" }] } },
  });
  await prisma.record.create({
    data: { tenantId, type: "FUMIGATION", occurredAt: moment(-9), data: { summary: "Barbecho químico en el Lote 1, 220 ha" }, source: "WHATSAPP", confidence: 0.95, rawMessage: "hicimos el barbecho del lote 1, las 220 ha", userId: ownerId, createdAt: moment(-9) },
  });
}

// ── Tambo Los Álamos ───────────────────────────────────────────
async function seedAlamos(tenantId: string, ownerId: string) {
  await prisma.pasture.create({ data: { tenantId, name: "Tambo", hectares: 180, crops: { create: [{ crop: "Alfalfa", hectares: 180 }] }, animals: { create: [{ animalType: "Vacas en ordeñe", quantity: 210 }, { animalType: "Vacas secas", quantity: 34 }] } } });
  const recria = await prisma.pasture.create({ data: { tenantId, name: "Recría", hectares: 40, animals: { create: [{ animalType: "Vaquillonas", quantity: 60 }] } } });
  for (let d = 28; d >= 1; d--) {
    await prisma.milkRecord.create({ data: { tenantId, date: dateOnly(-d), liters: Math.round(5_350 + Math.cos(d / 4) * 140), cowsMilking: 210, cowsDry: 34 } });
  }
  await prisma.milkSettlement.create({
    data: { tenantId, periodStart: dateOnly(-45), periodEnd: dateOnly(-16), dairy: "SanCor", liters: 158_000, fatPct: 3.7, proteinPct: 3.4, pricePerLiter: 428, totalAmount: 67_624_000 },
  });
  const alimento = await prisma.supplyCategory.create({ data: { tenantId, name: "Alimento", code: "ALIMENTO" } });
  const balanceado = await prisma.supply.create({ data: { tenantId, categoryId: alimento.id, name: "Balanceado 18%", unit: "kg", cost: 410, quantity: 24_000, currency: "ARS", vatRate: 10.5 } });
  let balance = 60_000;
  await prisma.stockMovement.create({ data: { tenantId, supplyId: balanceado.id, direction: "IN", quantity: balance, balance, unitCost: 410, currency: "ARS", source: "INITIAL", date: moment(-40) } });
  for (const daysAgo of [27, 20, 13, 6]) {
    balance -= 9_000;
    await prisma.stockMovement.create({ data: { tenantId, supplyId: balanceado.id, direction: "OUT", quantity: 9_000, balance, unitCost: 410, currency: "ARS", source: "WHATSAPP", date: moment(-daysAgo) } });
  }
  await prisma.weighing.create({ data: { tenantId, pastureId: recria.id, animalType: "Vaquillonas", date: moment(-62), headCount: 60, averageKg: 268, source: "WHATSAPP" } });
  await prisma.weighing.create({ data: { tenantId, pastureId: recria.id, animalType: "Vaquillonas", date: moment(-3), headCount: 60, averageKg: 312, source: "WHATSAPP" } });
  await prisma.record.create({
    data: { tenantId, type: "MILK_PRODUCTION", occurredAt: moment(-1), data: { summary: "Tambo: 5.420 litros con 210 vacas" }, source: "WHATSAPP", confidence: 0.96, rawMessage: "5420 litros hoy con 210 vacas", userId: ownerId, createdAt: moment(-1) },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
