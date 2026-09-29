/** El email que avisa al equipo de un pedido de demo. Fuera de producción, el
 *  asunto dice de qué entorno viene, para no confundir pruebas con pedidos
 *  reales. Puro: se testea sin base. */

import { DEMO_FIELD_COUNT_LABEL, DEMO_PROFILE_LABEL, type DemoRequestInput } from "./demo-request.schema";

type DemoRequestData = Omit<DemoRequestInput, "website">;

export function demoRequestEmail(request: DemoRequestData, environment: string | null): { subject: string; text: string } {
  const profile = DEMO_PROFILE_LABEL[request.profile];
  const fields = DEMO_FIELD_COUNT_LABEL[request.fieldCount].toLowerCase();
  const prefix = environment ? `[${environment}] ` : "";
  const whatsappDigits = request.whatsapp.replace(/\D/g, "");
  const lines = [
    `${request.name} pidió una demo de AgroData.`,
    "",
    `Perfil: ${profile}`,
    `Campos: ${fields}`,
    `WhatsApp: ${request.whatsapp} (https://wa.me/${whatsappDigits})`,
    `Email: ${request.email}`,
  ];
  if (request.message) lines.push("", "Mensaje:", request.message);
  return {
    subject: `${prefix}Pedido de demo: ${request.name} (${profile}, ${fields})`,
    text: lines.join("\n"),
  };
}
