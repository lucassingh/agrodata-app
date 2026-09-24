import { z } from "zod";

/** Pedido de demo desde la landing. Hoy solo se valida en el cliente; sin persistencia todavía. */
export const demoRequestSchema = z.object({
  name: z.string().trim().min(1, "Ingresá tu nombre").max(80),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{8,20}$/, "Ingresá un número de WhatsApp válido"),
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  profile: z.enum(["AGRONOMO", "VETERINARIO", "PRODUCTOR", "OTRO"], {
    errorMap: () => ({ message: "Elegí tu perfil" }),
  }),
  fieldCount: z.enum(["1", "2-5", "6-10", "10+"], {
    errorMap: () => ({ message: "Elegí cuántos campos manejás" }),
  }),
  message: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
