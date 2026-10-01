import { describe, expect, it } from "vitest";
import { accessInviteEmail, accessInviteWhatsAppText, canRegister, resolveSignupMode } from "./signup-policy";

describe("modo de registro", () => {
  it("producción cerrada por defecto; develop y local abiertos", () => {
    expect(resolveSignupMode({ VERCEL_ENV: "production" })).toBe("invite");
    expect(resolveSignupMode({ VERCEL_ENV: "preview" })).toBe("open");
    expect(resolveSignupMode({})).toBe("open");
  });

  it("la variable manda, en cualquier entorno", () => {
    expect(resolveSignupMode({ SIGNUP_MODE: "open", VERCEL_ENV: "production" })).toBe("open");
    expect(resolveSignupMode({ SIGNUP_MODE: "invite" })).toBe("invite");
    expect(resolveSignupMode({ SIGNUP_MODE: "cualquier cosa", VERCEL_ENV: "production" })).toBe("invite");
  });
});

describe("quién puede registrarse", () => {
  it("abierto: cualquiera", () => {
    expect(canRegister({ mode: "open", hasAccessInvite: false, hasTeamInvite: false })).toBe(true);
  });

  it("con invitación: el link de AgroData o la invitación de un equipo", () => {
    expect(canRegister({ mode: "invite", hasAccessInvite: false, hasTeamInvite: false })).toBe(false);
    expect(canRegister({ mode: "invite", hasAccessInvite: true, hasTeamInvite: false })).toBe(true);
    expect(canRegister({ mode: "invite", hasAccessInvite: false, hasTeamInvite: true })).toBe(true);
  });
});

describe("mail de acceso", () => {
  it("saluda por el nombre y lleva el link", () => {
    const mail = accessInviteEmail({ name: "Martín Sosa", link: "https://agrodata.app/dashboard/register?acceso=K3MQ-9XTA-7B2C", code: "K3MQ-9XTA-7B2C" });
    expect(mail.subject).toBe("Tu acceso a AgroData");
    expect(mail.text).toContain("Hola Martín:");
    expect(mail.text).toContain("https://agrodata.app/dashboard/register?acceso=K3MQ-9XTA-7B2C");
    expect(mail.text).toContain("tu código de acceso es K3MQ-9XTA-7B2C");
  });

  it("sin nombre, saludo genérico", () => {
    expect(accessInviteEmail({ name: null, link: "x", code: "c" }).text.startsWith("Hola:")).toBe(true);
    expect(accessInviteEmail({ name: "  ", link: "x", code: "c" }).text.startsWith("Hola:")).toBe(true);
  });
});

describe("aviso por WhatsApp", () => {
  it("una línea con el link y el código", () => {
    const text = accessInviteWhatsAppText({ name: "Ana", link: "https://x/r?acceso=K3MQ-9XTA-7B2C", code: "K3MQ-9XTA-7B2C" });
    expect(text.startsWith("Hola Ana, ya podés crear tu cuenta")).toBe(true);
    expect(text).toContain("https://x/r?acceso=K3MQ-9XTA-7B2C");
    expect(text).not.toContain("\n");
  });
});
