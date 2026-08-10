import "server-only";
import { badRequest } from "../errors";

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Port de invite-identifier.util.ts del backend legacy. */
export function normalizeArgWNumber(raw: string): string {
  const value = raw.replace(/\s+/g, "");
  if (/^\+54\d{10}$/.test(value)) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+54${digits}`;
  if (digits.length === 12 && digits.startsWith("54")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("9")) return `+54${digits.slice(1)}`;
  badRequest(
    "El número debe ser un WhatsApp válido: +54 seguido de 10 dígitos (ej. +542611234567).",
  );
}

export function parseInviteIdentifier(raw: string): { email?: string; wNumber?: string } {
  const trimmed = raw.trim();
  if (!trimmed) badRequest("Ingresá un correo o número de WhatsApp.");
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!EMAIL_LIKE.test(email)) badRequest("El correo electrónico no es válido.");
    return { email };
  }
  return { wNumber: normalizeArgWNumber(trimmed) };
}
