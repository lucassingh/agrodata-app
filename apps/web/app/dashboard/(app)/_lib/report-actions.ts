"use server";

import { requireUser } from "@/lib/session";
import { signatureSchema, updateSignature, type SignatureInput } from "@repo/core";

/** Guarda profesión y matrícula para la firma de los informes. */
export async function saveSignatureAction(input: SignatureInput) {
  const user = await requireUser();
  const parsed = signatureSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  await updateSignature(user.id, parsed.data);
  return { success: true as const };
}
