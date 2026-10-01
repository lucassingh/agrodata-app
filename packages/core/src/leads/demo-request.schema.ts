import { z } from "zod";

/** Perfiles y cantidades de campos del formulario de demo. La landing arma sus
 *  opciones con estas etiquetas y el email al equipo las usa para mostrarlas. */
export const DEMO_PROFILE_LABEL = {
  AGRONOMO: "Ingeniero agrónomo",
  VETERINARIO: "Veterinario",
  PRODUCTOR: "Productor",
  OTRO: "Otro",
} as const;

export const DEMO_FIELD_COUNT_LABEL = {
  "1": "1 campo",
  "2-5": "De 2 a 5 campos",
  "6-10": "De 6 a 10 campos",
  "10+": "Más de 10 campos",
} as const;

type ProfileValue = keyof typeof DEMO_PROFILE_LABEL;
type FieldCountValue = keyof typeof DEMO_FIELD_COUNT_LABEL;

/** Pedido de demo desde la landing. Se valida en el formulario y de nuevo en el servidor. */
export const demoRequestSchema = z.object({
  name: z.string().trim().min(1, "Ingresá tu nombre").max(80),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{8,20}$/, "Ingresá un número de WhatsApp válido"),
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  profile: z.enum(Object.keys(DEMO_PROFILE_LABEL) as [ProfileValue, ...ProfileValue[]], {
    errorMap: () => ({ message: "Elegí tu perfil" }),
  }),
  fieldCount: z.enum(Object.keys(DEMO_FIELD_COUNT_LABEL) as [FieldCountValue, ...FieldCountValue[]], {
    errorMap: () => ({ message: "Elegí cuántos campos manejás" }),
  }),
  message: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  /** Campo invisible: solo lo completa un robot. Si viene con algo, no se guarda nada. */
  website: z.string().optional(),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
