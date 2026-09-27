/** A qué campo va un mensaje de WhatsApp de alguien con varios campos (Etapa 4):
 *  1. si el mensaje nombra un campo, a ese;
 *  2. si no, al último usado (el campo activo), y la respuesta lo dice;
 *  3. «cambiá a El Retiro» solo cambia el campo.
 *  Coincidencia de texto, sin IA: no inventa campos y no cuesta nada. Puro. */

import { normalizeEntityName } from "./entity-name";

export interface FieldOption {
  tenantId: string;
  name: string;
}

/** Palabras genéricas al principio del nombre que la gente suele omitir
 *  («Estancia La Esperanza» → «la esperanza» → «esperanza»). */
const GENERIC_PREFIXES = ["estancia", "establecimiento", "campo", "tambo", "granja", "chacra", "la", "el", "los", "las", "don", "dona"];

/** Formas en que se puede nombrar un campo, de la más completa a la más corta
 *  (nunca menos de 4 letras, para no confundir con palabras comunes). */
function nameForms(name: string): string[] {
  const words = normalizeEntityName(name).split(" ").filter(Boolean);
  const forms = [words.join(" ")];
  let i = 0;
  while (i < words.length - 1 && GENERIC_PREFIXES.includes(words[i]!)) {
    i++;
    const rest = words.slice(i).join(" ");
    if (rest.length >= 4) forms.push(rest);
  }
  return forms;
}

const hasPhrase = (text: string, phrase: string) => ` ${text} `.includes(` ${phrase} `);

/** El campo que nombra el texto, o null. Si nombra más de uno con el mismo
 *  largo, es ambiguo: null (mejor el campo activo, que se avisa). */
export function mentionedField(text: string, fields: FieldOption[]): FieldOption | null {
  const normalized = normalizeEntityName(text).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ");
  let best: { field: FieldOption; length: number } | null = null;
  let tie = false;
  for (const field of fields) {
    const form = nameForms(field.name).find((f) => hasPhrase(normalized, f));
    if (!form) continue;
    if (!best || form.length > best.length) {
      best = { field, length: form.length };
      tie = false;
    } else if (form.length === best.length && best.field.tenantId !== field.tenantId) {
      tie = true;
    }
  }
  return best && !tie ? best.field : null;
}

const SWITCH = /^(?:cambia(?:r|me)?|pasa(?:r|me)?|usa(?:r)?|anda|ir)\s+(?:(?:el\s+)?campo\s+)?(?:a|al|en)\s+(?:el\s+campo\s+|campo\s+)?(.+)$/;

/** «Cambiá a El Retiro», «pasame al campo La Esperanza»: devuelve el texto del
 *  destino, o null si el mensaje no es un pedido de cambio de campo. */
export function switchTarget(text: string): string | null {
  const normalized = normalizeEntityName(text).replace(/[.!¡¿?]+/g, "").trim();
  return SWITCH.exec(normalized)?.[1]?.trim() || null;
}

export type FieldRoute =
  | { kind: "switch"; field: FieldOption }
  | { kind: "switch-unknown"; target: string }
  | { kind: "use"; field: FieldOption; named: boolean }
  | { kind: "ask" };

/** Decide el campo del mensaje. `activeTenantId` es el último usado. */
export function routeMessage(text: string | null | undefined, fields: FieldOption[], activeTenantId: string | null): FieldRoute {
  const active = fields.find((f) => f.tenantId === activeTenantId) ?? null;
  if (fields.length === 1) return { kind: "use", field: fields[0]!, named: false };

  const target = text ? switchTarget(text) : null;
  if (target !== null) {
    const field = mentionedField(target, fields);
    return field ? { kind: "switch", field } : { kind: "switch-unknown", target };
  }
  const named = text ? mentionedField(text, fields) : null;
  if (named) return { kind: "use", field: named, named: true };
  return active ? { kind: "use", field: active, named: false } : { kind: "ask" };
}

/** Encabezado de las respuestas para quien tiene varios campos. */
export function fieldHeader(name: string): string {
  return `📍 ${name}\n`;
}

export function fieldList(fields: FieldOption[]): string {
  return fields.map((f) => `• ${f.name}`).join("\n");
}
