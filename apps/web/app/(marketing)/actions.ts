"use server";

import { createDemoRequest, demoRequestSchema, type DemoRequestInput } from "@repo/core";

/** De qué entorno viene el pedido, para el asunto del email (null en producción). */
function environmentTag(): string | null {
  if (process.env.VERCEL_ENV === "production") return null;
  return process.env.VERCEL_ENV === "preview" ? "develop" : "local";
}

/** Pedido de demo desde la landing. Pública: la valida de nuevo el servidor. */
export async function submitDemoRequestAction(
  input: DemoRequestInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = demoRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  // Un robot completó el campo invisible: se le contesta que salió bien y no se guarda nada.
  if (parsed.data.website) return { success: true };
  try {
    await createDemoRequest(parsed.data, environmentTag());
    return { success: true };
  } catch (error) {
    console.error("[demo] no se pudo guardar el pedido", error);
    return { success: false, error: "No pudimos enviar tu pedido. Probá de nuevo en un rato o escribinos por WhatsApp." };
  }
}
