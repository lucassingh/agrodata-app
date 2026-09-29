import { describe, expect, it } from "vitest";
import { demoRequestEmail } from "./demo-request-email";
import { demoRequestSchema } from "./demo-request.schema";

const request = {
  name: "Ana Pérez",
  whatsapp: "+54 9 3462 55-1234",
  email: "ana@campo.com",
  profile: "AGRONOMO" as const,
  fieldCount: "2-5" as const,
  message: "Tengo 3 clientes con soja y maíz.",
};

describe("email de pedido de demo", () => {
  it("dice quién es, su perfil, cuántos campos maneja y cómo contactarlo", () => {
    const email = demoRequestEmail(request, null);
    expect(email.subject).toBe("Pedido de demo: Ana Pérez (Ingeniero agrónomo, de 2 a 5 campos)");
    expect(email.text).toContain("WhatsApp: +54 9 3462 55-1234 (https://wa.me/5493462551234)");
    expect(email.text).toContain("Email: ana@campo.com");
    expect(email.text).toContain("Mensaje:\nTengo 3 clientes con soja y maíz.");
  });

  it("fuera de producción, el asunto dice de qué entorno viene; sin mensaje no hay sección", () => {
    const email = demoRequestEmail({ ...request, message: undefined }, "develop");
    expect(email.subject.startsWith("[develop] Pedido de demo")).toBe(true);
    expect(email.text).not.toContain("Mensaje:");
  });
});

describe("validación del pedido", () => {
  it("acepta un pedido completo y rechaza un perfil desconocido", () => {
    expect(demoRequestSchema.safeParse(request).success).toBe(true);
    expect(demoRequestSchema.safeParse({ ...request, profile: "PILOTO" }).success).toBe(false);
  });
});
