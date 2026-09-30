import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidWebhookSignature, parseSignatureHeader, signatureManifest } from "./webhook-signature";

const SECRET = "clave-de-prueba";
const sign = (manifest: string) => createHmac("sha256", SECRET).update(manifest).digest("hex");

describe("firma de los avisos de Mercado Pago", () => {
  it("lee ts y v1 del encabezado", () => {
    expect(parseSignatureHeader("ts=1742505638683,v1=ced36ab6")).toEqual({ ts: "1742505638683", v1: "ced36ab6" });
    expect(parseSignatureHeader("ts=1,otro=2")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("arma la plantilla y saca lo que no vino", () => {
    expect(signatureManifest("123456", "req-1", "1742505638683")).toBe("id:123456;request-id:req-1;ts:1742505638683;");
    expect(signatureManifest("ABC", null, "1")).toBe("id:abc;ts:1;");
  });

  it("acepta la firma buena y rechaza cualquier cambio", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:1742505638683;");
    const header = `ts=1742505638683,v1=${v1}`;
    expect(isValidWebhookSignature({ signatureHeader: header, requestId: "req-1", dataId: "123456", secret: SECRET })).toBe(true);
    expect(isValidWebhookSignature({ signatureHeader: header, requestId: "req-1", dataId: "999999", secret: SECRET })).toBe(false);
    expect(isValidWebhookSignature({ signatureHeader: header, requestId: "req-1", dataId: "123456", secret: "otra" })).toBe(false);
    expect(isValidWebhookSignature({ signatureHeader: "ts=1,v1=zz", requestId: null, dataId: "1", secret: SECRET })).toBe(false);
  });
});
