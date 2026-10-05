"use server";

import { requireUser } from "@/lib/session";
import { AppError, removeReportLogo, saveReportLogo, signatureSchema, updateSignature, type SignatureInput } from "@repo/core";

type ActionResult = { success: true } | { success: false; error: string };

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

/** Sube (o reemplaza) el logo que va en los informes de quien firma. */
export async function uploadReportLogoAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const file = formData.get("logo");
  if (!(file instanceof File)) return { success: false, error: "Elegí una imagen." };
  try {
    await saveReportLogo(user.id, new Uint8Array(await file.arrayBuffer()));
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

export async function removeReportLogoAction(): Promise<ActionResult> {
  const user = await requireUser();
  await removeReportLogo(user.id);
  return { success: true };
}
