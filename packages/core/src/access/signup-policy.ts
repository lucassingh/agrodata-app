/** Acceso anticipado (Etapa 6.6): quién puede crear una cuenta. Puro: se testea sin base. */

/** `open`: cualquiera se registra y arranca la prueba. `invite`: solo con invitación. */
export type SignupMode = "open" | "invite";

/**
 * El modo sale de `SIGNUP_MODE`. Sin la variable, producción queda con
 * invitación (así nadie se registra solo mientras el bot no está andando) y
 * develop y local quedan abiertos para probar.
 */
export function resolveSignupMode(env: { SIGNUP_MODE?: string; VERCEL_ENV?: string }): SignupMode {
  if (env.SIGNUP_MODE === "open" || env.SIGNUP_MODE === "invite") return env.SIGNUP_MODE;
  return env.VERCEL_ENV === "production" ? "invite" : "open";
}

export const INVITE_REQUIRED_MESSAGE =
  "Estamos en acceso anticipado: para crear una cuenta necesitás una invitación de AgroData o de tu equipo. Pedí acceso en la página de AgroData y te damos de alta.";

/** Con invitación alcanza con una de las dos: la de AgroData (el link) o la de un equipo (por email o WhatsApp). */
export function canRegister(input: { mode: SignupMode; hasAccessInvite: boolean; hasTeamInvite: boolean }): boolean {
  return input.mode === "open" || input.hasAccessInvite || input.hasTeamInvite;
}

/** Días que dura el link de acceso. */
export const ACCESS_INVITE_DAYS = 30;

const greetingFor = (name: string | null) => (name?.trim() ? `Hola ${name.trim().split(/\s+/)[0]}` : "Hola");

/** Mail con el link de acceso. */
export function accessInviteEmail(input: { name: string | null; link: string; code: string }): { subject: string; text: string } {
  const greeting = `${greetingFor(input.name)}:`;
  return {
    subject: "Tu acceso a AgroData",
    text: [
      greeting,
      "",
      "Ya podés crear tu cuenta en AgroData. Arrancás con 14 días gratis de todo el plan Asesor, sin tarjeta.",
      "",
      `Creá tu cuenta acá: ${input.link}`,
      `(Si te lo pide, tu código de acceso es ${input.code}.)`,
      "",
      `El link es personal y vence en ${ACCESS_INVITE_DAYS} días. Cuando entres, una guía en cada pantalla te muestra cómo se usa.`,
      "",
      "Cualquier duda, respondé este mail.",
      "El equipo de AgroData",
    ].join("\n"),
  };
}

/** El mismo aviso, corto, para mandarlo por WhatsApp desde Soporte. */
export function accessInviteWhatsAppText(input: { name: string | null; link: string; code: string }): string {
  return `${greetingFor(input.name)}, ya podés crear tu cuenta en AgroData, con 14 días gratis: ${input.link} (tu código de acceso es ${input.code}; vence en ${ACCESS_INVITE_DAYS} días).`;
}
