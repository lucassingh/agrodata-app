import { describe, expect, it } from "vitest";
import { ACCESS_CODE_BYTES, formatAccessCode } from "./access-code";

describe("código de acceso", () => {
  it("tres grupos de cuatro, sin caracteres que se confunden", () => {
    const bytes = Uint8Array.from({ length: ACCESS_CODE_BYTES }, (_, i) => i * 37);
    const code = formatAccessCode(bytes);
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });
});
