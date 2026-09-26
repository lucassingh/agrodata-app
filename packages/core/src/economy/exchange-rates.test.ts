import { describe, expect, it } from "vitest";
import { parseBcraRates, parseCurrentRates, parseHistoricalRates } from "./exchange-rates";

describe("parseCurrentRates", () => {
  it("toma los tipos conocidos con el día argentino", () => {
    const rates = parseCurrentRates(
      [
        { casa: "mayorista", compra: 1516.5, venta: 1525.5, fechaActualizacion: "2026-09-25T16:06:00.000Z" },
        { casa: "blue", compra: 1540, venta: 1560 },
        { casa: "desconocido", compra: 1, venta: 2 },
        { casa: "oficial", compra: null, venta: null },
      ],
      "2026-09-25",
    );
    expect(rates).toEqual([
      { kind: "MAYORISTA", day: "2026-09-25", buy: 1516.5, sell: 1525.5 },
      { kind: "BLUE", day: "2026-09-25", buy: 1540, sell: 1560 },
    ]);
  });

  it("una respuesta rara no rompe nada", () => {
    expect(parseCurrentRates({ error: "down" }, "2026-09-25")).toEqual([]);
  });
});

describe("parseHistoricalRates", () => {
  it("descarta filas sin fecha válida o sin valor, y tipos que no guardamos", () => {
    const rates = parseHistoricalRates([
      { casa: "mayorista", compra: 3.97, venta: 3.98, fecha: "2011-01-03" },
      { casa: "solidario", compra: 10, venta: 11, fecha: "2020-01-03" },
      { casa: "oficial", compra: 5, venta: 0, fecha: "2012-01-03" },
      { casa: "bolsa", compra: 100, venta: 101, fecha: "03/01/2020" },
    ]);
    expect(rates).toEqual([{ kind: "MAYORISTA", day: "2011-01-03", buy: 3.97, sell: 3.98 }]);
  });
});

describe("parseBcraRates", () => {
  it("toma el dólar de cada día como mayorista (A 3500)", () => {
    const rates = parseBcraRates({
      status: 200,
      results: [
        { fecha: "2026-09-25", detalle: [{ codigoMoneda: "USD", descripcion: "DOLAR E.E.U.U.", tipoPase: 0, tipoCotizacion: 1525.5 }] },
        { fecha: "2026-09-24", detalle: [{ codigoMoneda: "EUR", tipoCotizacion: 1700 }] },
        { fecha: "2026-09-23", detalle: [{ codigoMoneda: "USD", tipoCotizacion: 0 }] },
      ],
    });
    expect(rates).toEqual([{ kind: "MAYORISTA", day: "2026-09-25", buy: 1525.5, sell: 1525.5 }]);
  });

  it("una respuesta de error no rompe nada", () => {
    expect(parseBcraRates({ status: 400, errorMessages: ["x"] })).toEqual([]);
  });
});
