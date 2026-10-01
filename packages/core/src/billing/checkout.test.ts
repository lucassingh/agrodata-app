import { describe, expect, it } from "vitest";
import {
  billedMonths,
  checkoutQuote,
  isPaymentPeriod,
  mercadoPagoDate,
  paymentOutcome,
  paymentTitle,
  pickRelevantPayment,
  resolvePaymentsEnabled,
} from "./checkout";

describe("precio de un período", () => {
  it("en pesos enteros al dólar del día", () => {
    expect(checkoutQuote("ASESOR", 1, 1475.5)).toEqual({ plan: "ASESOR", months: 1, amountUsd: 199, exchangeRate: 1475.5, amountArs: 293625 });
    expect(checkoutQuote("CAMPO", 3, 1000)?.amountArs).toBe(87000);
  });

  it("el anual paga 10 meses", () => {
    expect(billedMonths(12)).toBe(10);
    expect(checkoutQuote("CAMPO", 12, 1000)?.amountUsd).toBe(290);
  });

  it("el plan a medida o sin cotización no se cobra acá", () => {
    expect(checkoutQuote("EMPRESA", 1, 1000)).toBeNull();
    expect(checkoutQuote("CAMPO", 1, 0)).toBeNull();
  });

  it("solo 1, 3 o 12 meses", () => {
    expect([1, 3, 12].every(isPaymentPeriod)).toBe(true);
    expect(isPaymentPeriod(6)).toBe(false);
  });

  it("título del cobro", () => {
    expect(paymentTitle("ASESOR", 12)).toBe("AgroData - Plan Asesor (12 meses)");
    expect(paymentTitle("CAMPO", 1)).not.toContain(":");
  });
});

describe("pagos prendidos o apagados", () => {
  it("sin credencial, nunca", () => {
    expect(resolvePaymentsEnabled({ PAYMENTS_ENABLED: "true", hasAccessToken: false })).toBe(false);
  });

  it("por defecto: develop y local sí, producción no", () => {
    expect(resolvePaymentsEnabled({ VERCEL_ENV: "preview", hasAccessToken: true })).toBe(true);
    expect(resolvePaymentsEnabled({ hasAccessToken: true })).toBe(true);
    expect(resolvePaymentsEnabled({ VERCEL_ENV: "production", hasAccessToken: true })).toBe(false);
  });

  it("la variable manda", () => {
    expect(resolvePaymentsEnabled({ PAYMENTS_ENABLED: "true", VERCEL_ENV: "production", hasAccessToken: true })).toBe(true);
    expect(resolvePaymentsEnabled({ PAYMENTS_ENABLED: "false", hasAccessToken: true })).toBe(false);
  });
});

describe("qué hacer con un pago de Mercado Pago", () => {
  const local = { id: "pay_1", amountArs: 293625 };
  const remote = (status: string, extra: Partial<{ transactionAmount: number; currency: string; externalReference: string | null }> = {}) => ({
    status,
    transactionAmount: 293625,
    currency: "ARS",
    externalReference: "pay_1",
    ...extra,
  });

  it("aprobado, nuestro y por el monto: activa", () => {
    expect(paymentOutcome(local, remote("approved"))).toEqual({ kind: "approve" });
  });

  it("aprobado por menos plata o en otra moneda: no activa", () => {
    expect(paymentOutcome(local, remote("approved", { transactionAmount: 1000 }))).toEqual({ kind: "mismatch" });
    expect(paymentOutcome(local, remote("approved", { currency: "USD" }))).toEqual({ kind: "mismatch" });
  });

  it("de otro pago: se ignora", () => {
    expect(paymentOutcome(local, remote("approved", { externalReference: "otro" }))).toEqual({ kind: "ignore" });
  });

  it("pendiente, rechazado o devuelto", () => {
    expect(paymentOutcome(local, remote("in_process"))).toEqual({ kind: "status", status: "PENDING" });
    expect(paymentOutcome(local, remote("pending"))).toEqual({ kind: "status", status: "PENDING" });
    expect(paymentOutcome(local, remote("rejected"))).toEqual({ kind: "status", status: "REJECTED" });
    expect(paymentOutcome(local, remote("refunded"))).toEqual({ kind: "status", status: "CANCELLED" });
  });

  it("entre varios intentos manda el aprobado; si no, el último", () => {
    const tries = [
      { id: 1, status: "rejected", dateCreated: "2026-09-30T10:00:00.000-04:00" },
      { id: 2, status: "approved", dateCreated: "2026-09-30T10:05:00.000-04:00" },
      { id: 3, status: "rejected", dateCreated: "2026-09-30T10:10:00.000-04:00" },
    ];
    expect(pickRelevantPayment(tries)?.id).toBe(2);
    expect(pickRelevantPayment(tries.filter((t) => t.status === "rejected"))?.id).toBe(3);
    expect(pickRelevantPayment([])).toBeNull();
  });
});

describe("fechas para Mercado Pago", () => {
  it("con el huso argentino", () => {
    expect(mercadoPagoDate(new Date("2026-10-02T15:00:00Z"))).toBe("2026-10-02T12:00:00.000-03:00");
  });
});
