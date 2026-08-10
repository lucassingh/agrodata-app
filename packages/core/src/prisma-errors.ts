import "server-only";
import { Prisma } from "@repo/database";

/**
 * El backend legacy deja burbujear los errores crudos de Prisma en varios
 * lugares (nombre duplicado, borrar una categoría todavía referenciada) — acá
 * se traducen a mensajes en español, sin cambiar el comportamiento en el
 * camino feliz.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export function isForeignKeyRestrictError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
  );
}
