import { findByNormalizedName, normalizeEntityName } from "./entity-name";
import { formatMoney, formatQuantity, todayInArgentina, type FarmEvent } from "./farm-event";
import { unitsConflict } from "./units";

/** Catálogo del campo (ver `loadTenantCatalog`). */
export interface TenantCatalog {
  expenseCategories: { id: string; name: string }[];
  supplyCategories: { id: string; name: string }[];
  supplies: { id: string; name: string; unit: string | null; quantity: number; categoryId: string }[];
  pastures: {
    id: string;
    name: string;
    hectares: number | null;
    crops: { id: string; crop: string }[];
    animals: { id: string; animalType: string; quantity: number }[];
  }[];
  animalCategories: { id: string; name: string }[];
}

/** Referencia a una entidad: una que ya existe, o una que el plan va a crear. */
export type EntityRef = { existingId: string } | { newKey: string };

export type Creation =
  | { key: string; kind: "expenseCategory"; name: string }
  | { key: string; kind: "supplyCategory"; name: string }
  | { key: string; kind: "supply"; name: string; unit: string | null; categoryRef: EntityRef; categoryName: string }
  | { key: string; kind: "pasture"; name: string; hectares: number | null }
  | { key: string; kind: "animalCategory"; name: string };

export type TaskKind = "PULVERIZACION" | "FERTILIZACION" | "TRATAMIENTO_SANITARIO";

export type Effect =
  | {
      kind: "expense";
      categoryRef: EntityRef;
      categoryName: string;
      amount: number;
      currency: "ARS" | "USD";
      date: string;
      description: string;
    }
  | { kind: "stock"; supplyRef: EntityRef; supplyName: string; direction: "in" | "out"; quantity: number; unit: string | null }
  | { kind: "addCrop"; pastureRef: EntityRef; pastureName: string; crop: string; hectares: number | null; startDate: string }
  | { kind: "addAnimals"; pastureRef: EntityRef; pastureName: string; animalType: string; quantity: number }
  | {
      kind: "moveAnimals";
      fromPastureId: string;
      fromPastureName: string;
      toPastureRef: EntityRef;
      toPastureName: string;
      animalType: string;
      quantity: number;
    }
  | {
      kind: "task";
      taskType: TaskKind;
      date: string;
      description: string;
      crop: string | null;
      treatment: string | null;
      pastures: { ref: EntityRef; name: string; hectares: number | null }[];
      products: { name: string; dosis: string | null; unit: string | null }[];
      animals: { animalType: string; quantity: number }[];
    };

/** Todo lo que un mensaje provoca en el sistema. `creations` son las entidades
 *  que faltan: si hay alguna, el bot pregunta antes de aplicar nada. `notes` son
 *  avisos de cosas que NO se hicieron (o se hicieron con un límite), para
 *  contárselas al productor. */
export interface MessagePlan {
  creations: Creation[];
  effects: Effect[];
  notes: string[];
}

/** Tope real de cultivos y de tipos de animal por potrero (mismo que el dashboard). */
export const MAX_ITEMS_PER_PASTURE = 5;

const EXPENSE_TYPES = new Set(["PURCHASE", "FUEL_USAGE", "EXPENSE_INVOICE"]);
const TASK_TYPES: Record<string, TaskKind> = {
  FUMIGATION: "PULVERIZACION",
  FERTILIZATION: "FERTILIZACION",
  SANITARY_TREATMENT: "TRATAMIENTO_SANITARIO",
};
const FALLBACK_CATEGORY = "Varios";

class PlanBuilder {
  readonly plan: MessagePlan = { creations: [], effects: [], notes: [] };

  /** Registra una entidad a crear (una sola vez por clave) y devuelve su referencia. */
  create(creation: Creation): EntityRef {
    if (!this.plan.creations.some((existing) => existing.key === creation.key)) {
      this.plan.creations.push(creation);
    }
    return { newKey: creation.key };
  }

  expenseCategory(catalog: TenantCatalog, name: string): EntityRef {
    const match = findByNormalizedName(catalog.expenseCategories, name);
    if (match) return { existingId: match.id };
    return this.create({ key: `expenseCategory:${normalizeEntityName(name)}`, kind: "expenseCategory", name });
  }

  supplyCategory(catalog: TenantCatalog, name: string): EntityRef {
    const match = findByNormalizedName(catalog.supplyCategories, name);
    if (match) return { existingId: match.id };
    return this.create({ key: `supplyCategory:${normalizeEntityName(name)}`, kind: "supplyCategory", name });
  }

  /** Potrero existente o a crear. `hectares` solo se usa si hay que crearlo. */
  pasture(catalog: TenantCatalog, name: string, hectares: number | null): { ref: EntityRef; name: string } {
    const match = findByNormalizedName(catalog.pastures, name);
    if (match) return { ref: { existingId: match.id }, name: match.name };
    return {
      ref: this.create({ key: `pasture:${normalizeEntityName(name)}`, kind: "pasture", name, hectares }),
      name,
    };
  }

  /** Nombre de categoría de animal tal como ya se usa en el campo, o null. */
  knownAnimalType(catalog: TenantCatalog, name: string): string | null {
    const known = [
      ...catalog.animalCategories.map((category) => category.name),
      ...catalog.pastures.flatMap((pasture) => pasture.animals.map((animal) => animal.animalType)),
    ].map((knownName) => ({ name: knownName }));
    return findByNormalizedName(known, name)?.name ?? null;
  }

  /** Categoría de animal existente, o una nueva a crear (con confirmación). */
  animalType(catalog: TenantCatalog, name: string): string {
    const known = this.knownAnimalType(catalog, name);
    if (known) return known;
    this.create({ key: `animalCategory:${normalizeEntityName(name)}`, kind: "animalCategory", name });
    return name;
  }
}

function eventDate(event: FarmEvent, now: Date): string {
  return event.occurredAt ?? todayInArgentina(now);
}

function planExpense(event: FarmEvent, catalog: TenantCatalog, builder: PlanBuilder, now: Date) {
  if (!EXPENSE_TYPES.has(event.type) || event.monto === null || event.monto <= 0) return;

  const categoryName = event.categoria?.trim() || FALLBACK_CATEGORY;
  const categoryRef = builder.expenseCategory(catalog, categoryName);
  const existing = "existingId" in categoryRef ? catalog.expenseCategories.find((c) => c.id === categoryRef.existingId) : null;

  const mentionsCounterpart =
    event.contraparte !== null && normalizeEntityName(event.summary).includes(normalizeEntityName(event.contraparte));
  const description = event.contraparte && !mentionsCounterpart ? `${event.summary} (${event.contraparte})` : event.summary;

  builder.plan.effects.push({
    kind: "expense",
    categoryRef,
    categoryName: existing?.name ?? categoryName,
    amount: event.monto,
    currency: event.moneda ?? "ARS",
    date: eventDate(event, now),
    description: description.slice(0, 500),
  });
}

function planStock(event: FarmEvent, catalog: TenantCatalog, builder: PlanBuilder) {
  if (event.movimientoStock === "NINGUNO" || !event.producto || event.cantidad === null || event.cantidad <= 0) return;

  const supply = findByNormalizedName(catalog.supplies, event.producto);
  const direction = event.movimientoStock === "INGRESO" ? "in" : "out";

  if (!supply) {
    if (direction === "out") {
      builder.plan.notes.push(`No descontamos stock de «${event.producto}»: no está cargado en Insumos.`);
      return;
    }
    const categoryName = event.categoria?.trim() || FALLBACK_CATEGORY;
    const categoryRef = builder.supplyCategory(catalog, categoryName);
    const supplyRef = builder.create({
      key: `supply:${normalizeEntityName(event.producto)}`,
      kind: "supply",
      name: event.producto,
      unit: event.unidad,
      categoryRef,
      categoryName,
    });
    builder.plan.effects.push({
      kind: "stock",
      supplyRef,
      supplyName: event.producto,
      direction,
      quantity: event.cantidad,
      unit: event.unidad,
    });
    return;
  }

  if (unitsConflict(supply.unit, event.unidad)) {
    const verb = direction === "in" ? "sumé" : "descontamos";
    builder.plan.notes.push(
      `No ${verb} stock de «${supply.name}»: se lleva en ${supply.unit} y el mensaje dice ${event.unidad}. Cargalo desde Insumos o mandalo en ${supply.unit}.`,
    );
    return;
  }

  if (direction === "out" && event.cantidad > supply.quantity) {
    builder.plan.notes.push(
      `«${supply.name}» quedó en 0: tenías ${formatQuantity(supply.quantity, supply.unit)} y el mensaje descuenta ${formatQuantity(event.cantidad, supply.unit)}.`,
    );
  }

  builder.plan.effects.push({
    kind: "stock",
    supplyRef: { existingId: supply.id },
    supplyName: supply.name,
    direction,
    quantity: event.cantidad,
    unit: supply.unit ?? event.unidad,
  });
}

function planSeeding(event: FarmEvent, catalog: TenantCatalog, builder: PlanBuilder, now: Date) {
  if (event.type !== "SEEDING" || !event.cultivo) return;
  if (!event.potrero) {
    builder.plan.notes.push("No dijiste en qué potrero sembraste, así que no lo agregué a Potreros.");
    return;
  }

  const pasture = builder.pasture(catalog, event.potrero, event.hectareas);
  const existing = "existingId" in pasture.ref ? catalog.pastures.find((p) => p.id === (pasture.ref as { existingId: string }).existingId) : null;

  if (existing) {
    if (findByNormalizedName(existing.crops.map((crop) => ({ name: crop.crop })), event.cultivo)) {
      builder.plan.notes.push(`«${existing.name}» ya tiene ${event.cultivo} cargado; no lo dupliqué.`);
      return;
    }
    if (existing.crops.length >= MAX_ITEMS_PER_PASTURE) {
      builder.plan.notes.push(
        `«${existing.name}» ya tiene ${MAX_ITEMS_PER_PASTURE} cultivos (el máximo); no sumé ${event.cultivo}.`,
      );
      return;
    }
  }

  builder.plan.effects.push({
    kind: "addCrop",
    pastureRef: pasture.ref,
    pastureName: pasture.name,
    crop: event.cultivo,
    hectares: event.hectareas,
    startDate: eventDate(event, now),
  });
}

function wholeCount(value: number | null): number | null {
  return value !== null && Number.isInteger(value) && value > 0 ? value : null;
}

function planAnimals(event: FarmEvent, catalog: TenantCatalog, builder: PlanBuilder) {
  if (event.type !== "ANIMAL_BIRTH" && event.type !== "POTRERO_CHANGE") return;

  const quantity = wholeCount(event.cantidad);
  if (!event.item || quantity === null) {
    builder.plan.notes.push("Faltó la cantidad o la categoría de los animales, así que no actualicé Potreros.");
    return;
  }

  if (event.type === "ANIMAL_BIRTH") {
    if (!event.potrero) {
      builder.plan.notes.push("No dijiste en qué potrero nacieron, así que no sumé los animales a Potreros.");
      return;
    }
    const pasture = builder.pasture(catalog, event.potrero, null);
    const existing = "existingId" in pasture.ref ? catalog.pastures.find((p) => p.id === (pasture.ref as { existingId: string }).existingId) : null;
    const animalType = builder.animalType(catalog, event.item);
    const alreadyThere = existing?.animals.some(
      (animal) => normalizeEntityName(animal.animalType) === normalizeEntityName(animalType),
    );
    if (existing && !alreadyThere && existing.animals.length >= MAX_ITEMS_PER_PASTURE) {
      builder.plan.notes.push(
        `«${existing.name}» ya tiene ${MAX_ITEMS_PER_PASTURE} tipos de animales (el máximo); no sumé ${animalType}.`,
      );
      return;
    }
    builder.plan.effects.push({ kind: "addAnimals", pastureRef: pasture.ref, pastureName: pasture.name, animalType, quantity });
    return;
  }

  // POTRERO_CHANGE
  if (!event.potrero || !event.destinoPotrero) {
    builder.plan.notes.push("Faltó el potrero de origen o el de destino, así que no moví animales.");
    return;
  }
  const from = findByNormalizedName(catalog.pastures, event.potrero);
  if (!from) {
    builder.plan.notes.push(`No tenés un potrero «${event.potrero}» cargado, así que no moví animales.`);
    return;
  }
  const herd = from.animals.find((animal) => normalizeEntityName(animal.animalType) === normalizeEntityName(event.item!));
  if (!herd || herd.quantity < quantity) {
    const available = herd ? `${herd.quantity}` : "ningún";
    builder.plan.notes.push(
      `En «${from.name}» hay ${available} ${herd?.animalType ?? event.item} cargados, no ${quantity}; no moví nada. Revisá Potreros.`,
    );
    return;
  }
  const to = builder.pasture(catalog, event.destinoPotrero, null);
  if (normalizeEntityName(to.name) === normalizeEntityName(from.name)) {
    builder.plan.notes.push("El potrero de origen y el de destino son el mismo; no moví nada.");
    return;
  }
  builder.plan.effects.push({
    kind: "moveAnimals",
    fromPastureId: from.id,
    fromPastureName: from.name,
    toPastureRef: to.ref,
    toPastureName: to.name,
    animalType: herd.animalType,
    quantity,
  });
}

function planTask(event: FarmEvent, catalog: TenantCatalog, builder: PlanBuilder, now: Date) {
  const taskType = TASK_TYPES[event.type];
  if (!taskType) return;

  const pastures = event.potrero
    ? [{ ...builder.pasture(catalog, event.potrero, event.hectareas), hectares: event.hectareas }]
    : [];
  const animalCount = wholeCount(event.cantidad);
  const animals =
    taskType === "TRATAMIENTO_SANITARIO" && event.item && animalCount !== null
      ? [{ animalType: builder.knownAnimalType(catalog, event.item) ?? event.item, quantity: animalCount }]
      : [];

  builder.plan.effects.push({
    kind: "task",
    taskType,
    date: eventDate(event, now),
    description: event.summary,
    crop: event.cultivo,
    treatment: taskType === "TRATAMIENTO_SANITARIO" ? event.producto : null,
    pastures,
    products: event.producto ? [{ name: event.producto, dosis: event.dosis, unit: event.unidad }] : [],
    animals,
  });
}

/** Decide todos los efectos de un mensaje sobre el campo, sin tocar la base.
 *  Función pura: mismo evento + mismo catálogo → mismo plan. */
export function planMessageEffects(event: FarmEvent, catalog: TenantCatalog, now: Date = new Date()): MessagePlan {
  const builder = new PlanBuilder();
  planExpense(event, catalog, builder, now);
  planStock(event, catalog, builder);
  planSeeding(event, catalog, builder, now);
  planAnimals(event, catalog, builder);
  planTask(event, catalog, builder, now);
  return builder.plan;
}

function describeCreation(creation: Creation): string {
  switch (creation.kind) {
    case "expenseCategory":
      return `la categoría de gasto «${creation.name}»`;
    case "supplyCategory":
      return `la categoría de insumos «${creation.name}»`;
    case "supply":
      return `el insumo «${creation.name}»${creation.unit ? ` (en ${creation.unit})` : ""}`;
    case "pasture":
      return `el potrero «${creation.name}»${creation.hectares !== null ? ` (${formatQuantity(creation.hectares, "ha")})` : ""}`;
    case "animalCategory":
      return `la categoría de animales «${creation.name}»`;
  }
}

/** Pregunta de confirmación cuando el plan necesita crear entidades. */
export function confirmationQuestion(plan: MessagePlan): string {
  const items = plan.creations.map(describeCreation);
  const notes = plan.notes.length > 0 ? `\n\n${plan.notes.map((note) => `⚠️ ${note}`).join("\n")}` : "";
  return `Para cargar esto tengo que crear ${joinSpanish(items)}. ¿Lo creo? Respondé sí o no.${notes}`;
}

const TASK_LABEL: Record<TaskKind, string> = {
  PULVERIZACION: "pulverización",
  FERTILIZACION: "fertilización",
  TRATAMIENTO_SANITARIO: "tratamiento sanitario",
};

export function describeEffect(effect: Effect): string {
  switch (effect.kind) {
    case "expense":
      return `Gasto de ${formatMoney(effect.amount, effect.currency)} en «${effect.categoryName}»`;
    case "stock":
      return `Stock de «${effect.supplyName}»: ${effect.direction === "in" ? "+" : "−"}${formatQuantity(effect.quantity, effect.unit)}`;
    case "addCrop":
      return `${effect.crop} en el potrero «${effect.pastureName}»${effect.hectares !== null ? ` (${formatQuantity(effect.hectares, "ha")})` : ""}`;
    case "addAnimals":
      return `+${effect.quantity} ${effect.animalType} en «${effect.pastureName}»`;
    case "moveAnimals":
      return `${effect.quantity} ${effect.animalType} de «${effect.fromPastureName}» a «${effect.toPastureName}»`;
    case "task":
      return `Tarea de ${TASK_LABEL[effect.taskType]}${effect.pastures.length > 0 ? ` en «${effect.pastures.map((p) => p.name).join("», «")}»` : ""} (completada)`;
  }
}

/** Mensaje final para WhatsApp: qué se registró, qué impactó y qué no se pudo. */
export function resultMessage(summary: string, lines: string[], notes: string[]): string {
  const parts = [`✅ Registrado: ${summary}`];
  if (lines.length > 0) parts.push(lines.map((line) => `• ${line}`).join("\n"));
  if (notes.length > 0) parts.push(notes.map((note) => `⚠️ ${note}`).join("\n"));
  return parts.join("\n");
}

function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
