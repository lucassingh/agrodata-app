import "server-only";
import { headers } from "next/headers";
import { SITE_URL } from "./site-url";

/** El dominio desde el que se está usando la app (producción, develop o local), para armar los
 *  links de las invitaciones. Las server actions siempre traen `origin`. */
export async function requestOrigin(): Promise<string> {
  return (await headers()).get("origin") ?? SITE_URL;
}
