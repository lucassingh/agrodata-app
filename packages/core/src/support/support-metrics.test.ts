import { describe, expect, it } from "vitest";
import { lastWeeks, weekStart, weeklyMetrics } from "./support-metrics";

describe("semanas", () => {
  it("la semana arranca el lunes, también si el día es domingo", () => {
    expect(weekStart("2026-09-29")).toBe("2026-09-28"); // martes
    expect(weekStart("2026-09-28")).toBe("2026-09-28"); // lunes
    expect(weekStart("2026-10-04")).toBe("2026-09-28"); // domingo
  });

  it("las últimas semanas, de la más vieja a la actual, cruzando el mes", () => {
    expect(lastWeeks("2026-09-29", 3)).toEqual(["2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(lastWeeks("2026-10-01", 2)).toEqual(["2026-09-21", "2026-09-28"]);
  });
});

describe("métricas por semana", () => {
  const weeks = ["2026-09-21", "2026-09-28"];

  it("cuenta usuarios, campos, registros por canal y campos activos", () => {
    const [previous, current] = weeklyMetrics({
      weeks,
      users: [{ createdDay: "2026-09-22" }, { createdDay: "2026-09-29" }, { createdDay: "2026-09-30" }],
      fields: [],
      records: [
        { createdDay: "2026-09-28", tenantId: "a", fromWhatsApp: true, edited: false },
        { createdDay: "2026-09-29", tenantId: "a", fromWhatsApp: true, edited: true },
        { createdDay: "2026-09-29", tenantId: "b", fromWhatsApp: false, edited: false },
        { createdDay: "2026-09-21", tenantId: "c", fromWhatsApp: false, edited: false },
      ],
    });
    expect(previous).toMatchObject({ newUsers: 1, whatsappRecords: 0, webRecords: 1, editedPct: null, activeFields: 1 });
    expect(current).toMatchObject({ newUsers: 2, whatsappRecords: 2, webRecords: 1, whatsappEdited: 1, editedPct: 50, activeFields: 2 });
  });

  it("un campo se activa si en su primera semana tiene potreros y un primer dato", () => {
    const [, current] = weeklyMetrics({
      weeks,
      users: [],
      records: [],
      fields: [
        { createdDay: "2026-09-28", firstPastureDay: "2026-09-28", firstRecordDay: "2026-10-02" },
        { createdDay: "2026-09-28", firstPastureDay: "2026-09-29", firstRecordDay: null },
        { createdDay: "2026-09-29", firstPastureDay: "2026-09-30", firstRecordDay: "2026-10-10" },
      ],
    });
    expect(current).toMatchObject({ newFields: 3, activatedFields: 1 });
  });
});
