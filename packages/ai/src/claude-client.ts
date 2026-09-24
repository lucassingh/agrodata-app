import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

/** Modelo por defecto para todas las llamadas de este paquete. Ajustable por
 *  caso de uso si el costo/latencia lo requiere -- no hay ningún motivo de
 *  negocio para fijar uno distinto todavía. */
export const CLAUDE_MODEL = "claude-opus-5";
