import { describe, expect, it } from "vitest";
import { ACCESS_CODE_BYTES, formatAccessCode, normalizeAccessCode } from "./access-code";

describe("código de acceso", () => {
  it("tres grupos de cuatro, sin caracteres que se confunden", () => {
    const bytes = Uint8Array.from({ length: ACCESS_CODE_BYTES }, (_, i) => i * 37);
    const code = formatAccessCode(bytes);
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });

  it("acepta el código como lo tipee la persona", () => {
    expect(normalizeAccessCode("k3mq 9xta 7b2c")).toBe("K3MQ-9XTA-7B2C");
    expect(normalizeAccessCode(" K3MQ-9XTA-7B2C ")).toBe("K3MQ-9XTA-7B2C");
  });

  it("descarta lo que no es un código", () => {
    expect(normalizeAccessCode("")).toBeNull();
    expect(normalizeAccessCode(null)).toBeNull();
    expect(normalizeAccessCode("K3MQ-9XTA")).toBeNull();
    // 0 y O no están en el alfabeto
    expect(normalizeAccessCode("K3MQ-9XTA-7B20")).toBeNull();
  });
});
