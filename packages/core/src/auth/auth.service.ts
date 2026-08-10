import "server-only";
import { prisma, hashPassword, verifyPassword } from "@repo/database";
import { badRequest, conflict, notFound, unauthorized } from "../errors";
import { redeemPendingInvitesForNewUser } from "../memberships/memberships.service";
import { canAccessWebApp } from "./capabilities";
import type { RegisterInput } from "./register.schema";

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

async function generateVerificationCode(userId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.verificationCode.create({
    data: { userId, code, expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS) },
  });
  // No hay integración real de WhatsApp todavía (Fase 4 del roadmap) — se loguea el
  // código igual que en el backend legacy.
  console.log(`[MOCK] Código de verificación para el usuario ${userId}: ${code}`);
  return code;
}

function mockCodeIfDev(code: string): string | undefined {
  return process.env.NODE_ENV !== "production" ? code : undefined;
}

async function assertWebAppAccess(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isSuperAdmin: true,
      email: true,
      memberships: { where: { status: "ACTIVE" }, select: { role: true } },
      _count: { select: { memberships: true } },
    },
  });
  if (!user) unauthorized("Usuario no encontrado");
  const allowed = canAccessWebApp({
    isSuperAdmin: user.isSuperAdmin,
    email: user.email,
    activeMemberships: user.memberships,
    totalMembershipRows: user._count.memberships,
  });
  if (!allowed) {
    unauthorized(
      "El acceso a la aplicación web es solo para Owner o Farm Manager. Operator usa WhatsApp.",
    );
  }
}

export async function registerUser(input: RegisterInput) {
  if (input.password !== input.confirmPassword) {
    badRequest("Las contraseñas no coinciden");
  }
  if (!input.acceptTerms) {
    badRequest("Debe aceptar los términos y condiciones");
  }

  const email = input.email.trim().toLowerCase();

  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { wNumber: input.wNumber } }),
  ]);
  if (existingEmail) conflict("Ya existe una cuenta con ese email.");
  if (existingPhone) conflict("Ya existe una cuenta con ese número de WhatsApp.");

  const isFirstUserInDatabase = (await prisma.user.count()) === 0;
  const passwordHash = await hashPassword(input.password);

  let user = await prisma.user.create({
    data: {
      name: input.name,
      lastname: input.lastname,
      email,
      wNumber: input.wNumber,
      passwordHash,
      profileType: input.profileType ?? "OTRO",
      isSuperAdmin: true,
      platformRole: isFirstUserInDatabase ? "OWNER" : "OPERATOR",
    },
  });

  const redeemed = await redeemPendingInvitesForNewUser(user.id, email, input.wNumber);

  if (redeemed.length > 0 && !isFirstUserInDatabase) {
    const first = redeemed[0]!;
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isSuperAdmin: false,
        platformRole: first.role === "ADMIN" ? "FARM_MANAGER" : "OPERATOR",
        activeTenantId: first.tenantId,
      },
    });
  } else if (isFirstUserInDatabase) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: true, platformRole: "OWNER" },
    });
  }

  const code = await generateVerificationCode(user.id);

  return {
    id: user.id,
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    wNumber: user.wNumber,
    profileType: user.profileType,
    verificationRequired: true,
    mockCode: mockCodeIfDev(code),
  };
}

export async function loginWithPassword(email: string, password: string) {
  const emailNorm = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (!user?.passwordHash) unauthorized("Credenciales inválidas.");
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) unauthorized("Credenciales inválidas.");
  await assertWebAppAccess(user.id);
  return user;
}

export async function requestWhatsappCode(wNumber: string) {
  const user = await prisma.user.findUnique({ where: { wNumber } });
  if (!user) notFound("No encontramos una cuenta con ese número de WhatsApp.");
  const code = await generateVerificationCode(user.id);
  return { mockCode: mockCodeIfDev(code) };
}

export async function resendWhatsappCode(wNumber: string) {
  return requestWhatsappCode(wNumber);
}

export async function verifyWhatsappCode(wNumber: string, code: string) {
  const user = await prisma.user.findUnique({ where: { wNumber } });
  if (!user) unauthorized("Código inválido o expirado.");

  const record = await prisma.verificationCode.findFirst({
    where: { userId: user.id, code, used: false, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) unauthorized("Código inválido o expirado.");

  await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } });
  await assertWebAppAccess(user.id);
  return user;
}
