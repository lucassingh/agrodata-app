import "server-only";
import { prisma } from "@repo/database";
import { sendEmail } from "../notifications/email.service";
import { demoRequestEmail } from "./demo-request-email";
import type { DemoRequestInput } from "./demo-request.schema";

/** Guarda el pedido de demo y avisa al equipo por email. Lo importante es que
 *  quede guardado: si el email falla, el pedido igual está y se ve en el panel. */
export async function createDemoRequest(input: DemoRequestInput, environment: string | null) {
  const { website: _honeypot, ...data } = input;
  const request = await prisma.demoRequest.create({
    data: {
      name: data.name,
      whatsapp: data.whatsapp,
      email: data.email,
      profile: data.profile,
      fieldCount: data.fieldCount,
      message: data.message || null,
    },
  });

  const to = process.env.DEMO_REQUESTS_EMAIL;
  if (!to) {
    console.warn("[demo] sin DEMO_REQUESTS_EMAIL: el pedido quedó guardado sin aviso", { id: request.id });
    return request;
  }
  try {
    const { sent } = await sendEmail({ to, ...demoRequestEmail(data, environment) });
    if (sent) await prisma.demoRequest.update({ where: { id: request.id }, data: { notifiedAt: new Date() } });
  } catch (error) {
    console.error("[demo] no se pudo avisar por email", { id: request.id, error });
  }
  return request;
}
