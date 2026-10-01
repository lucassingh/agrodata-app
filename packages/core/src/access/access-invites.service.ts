import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@repo/database";
import { badRequest } from "../errors";
import { sendEmail } from "../notifications/email.service";
import { ACCESS_CODE_BYTES, formatAccessCode, normalizeAccessCode } from "./access-code";
import { ACCESS_INVITE_DAYS, accessInviteEmail, accessInviteWhatsAppText } from "./signup-policy";

const DAY_MS = 86_400_000;

export const registerLink = (baseUrl: string, code: string) =>
  `${baseUrl.replace(/\/$/, "")}/dashboard/register?acceso=${encodeURIComponent(code)}`;

/**
 * Da acceso a una persona (desde Soporte). Si ya tiene un código sin usar, lo
 * renueva en vez de crear otro. Si sale de un pedido de demo, lo marca como
 * contactado. Intenta mandar el mail; si no sale (sin dominio verificado en
 * Resend solo llega al email de la cuenta), el link queda para copiarlo.
 */
export async function createAccessInvite(input: {
  email: string;
  name: string | null;
  demoRequestId: string | null;
  createdBy: string;
  baseUrl: string;
  now?: Date;
}) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) badRequest("Email inválido.");
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + ACCESS_INVITE_DAYS * DAY_MS);
  const name = input.name?.trim() || null;

  const alreadyRegistered = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (alreadyRegistered) badRequest("Esa persona ya tiene cuenta con ese email.");

  const open = await prisma.accessInvite.findFirst({ where: { email, usedAt: null }, orderBy: { createdAt: "desc" } });
  const invite = open
    ? await prisma.accessInvite.update({
        where: { id: open.id },
        data: { expiresAt, name: name ?? open.name, demoRequestId: input.demoRequestId ?? open.demoRequestId },
      })
    : await prisma.accessInvite.create({
        data: {
          token: formatAccessCode(randomBytes(ACCESS_CODE_BYTES)),
          email,
          name,
          demoRequestId: input.demoRequestId,
          createdBy: input.createdBy,
          expiresAt,
        },
      });

  if (input.demoRequestId) {
    await prisma.demoRequest.updateMany({ where: { id: input.demoRequestId, status: "NEW" }, data: { status: "CONTACTED" } });
  }

  const link = registerLink(input.baseUrl, invite.token);
  let emailed = false;
  try {
    emailed = (await sendEmail({ to: email, ...accessInviteEmail({ name: invite.name, link, code: invite.token }) })).sent;
  } catch (error) {
    console.error("[acceso] no se pudo mandar el mail", { id: invite.id, error });
  }

  return {
    code: invite.token,
    link,
    emailed,
    whatsappText: accessInviteWhatsAppText({ name: invite.name, link, code: invite.token }),
  };
}

/** El código vale si existe, no se usó y no venció. */
export async function findValidAccessInvite(rawCode: string | null | undefined, now = new Date()) {
  const code = normalizeAccessCode(rawCode);
  if (!code) return null;
  const invite = await prisma.accessInvite.findUnique({ where: { token: code } });
  if (!invite || invite.usedAt || invite.expiresAt <= now) return null;
  return invite;
}

/** Una invitación de equipo sin canjear para ese email o ese WhatsApp. */
export async function hasPendingTeamInvite(email: string, wNumber: string): Promise<boolean> {
  const count = await prisma.tenantPendingInvite.count({ where: { consumedAt: null, OR: [{ email }, { wNumber }] } });
  return count > 0;
}

/** Se marca al crear la cuenta. `usedAt: null` en el filtro: un código se usa una sola vez. */
export async function consumeAccessInvite(id: string, userId: string, now = new Date()) {
  await prisma.accessInvite.updateMany({ where: { id, usedAt: null }, data: { usedAt: now, usedByUserId: userId } });
}

/** Para Soporte: todos los accesos dados, el más nuevo primero. */
export function listAccessInvites() {
  return prisma.accessInvite.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
}

/** El último acceso dado por cada pedido de demo. */
export async function accessInvitesByDemoRequest(demoRequestIds: string[]) {
  const invites = await prisma.accessInvite.findMany({
    where: { demoRequestId: { in: demoRequestIds } },
    orderBy: { createdAt: "asc" },
  });
  return new Map(invites.map((i) => [i.demoRequestId!, i]));
}
