import { resolveSignupMode, type SignupMode } from "@repo/core/access/signup-policy";

/** Registro abierto o por invitación (Etapa 6.6). La landing se genera en el build:
 *  después de cambiar `SIGNUP_MODE` en Vercel hay que volver a deployar. */
export function signupMode(): SignupMode {
  return resolveSignupMode({ SIGNUP_MODE: process.env.SIGNUP_MODE, VERCEL_ENV: process.env.VERCEL_ENV });
}
