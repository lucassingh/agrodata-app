import { describe, expect, it } from "vitest";
import { detectLogoType, logoDataUri, logoProblem, MAX_LOGO_BYTES } from "./report-logo";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const SVG = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");

describe("logo del informe", () => {
  it("reconoce PNG y JPG por sus primeros bytes", () => {
    expect(detectLogoType(PNG)).toBe("image/png");
    expect(detectLogoType(JPG)).toBe("image/jpeg");
    expect(detectLogoType(SVG)).toBeNull();
  });

  it("dice por qué no sirve", () => {
    expect(logoProblem(PNG)).toBeNull();
    expect(logoProblem(new Uint8Array())).toBe("Elegí una imagen.");
    expect(logoProblem(SVG)).toBe("El logo tiene que ser PNG o JPG.");
    const big = new Uint8Array(MAX_LOGO_BYTES + 1);
    big.set(PNG);
    expect(logoProblem(big)).toBe("El logo puede pesar hasta 500 KB.");
  });

  it("arma el data URI para el PDF", () => {
    expect(logoDataUri(JPG, "image/jpeg")).toBe(`data:image/jpeg;base64,${Buffer.from(JPG).toString("base64")}`);
  });
});
