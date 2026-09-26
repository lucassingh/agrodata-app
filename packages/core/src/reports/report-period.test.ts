import { describe, expect, it } from "vitest";
import { reportPeriod } from "./report-period";

describe("período del informe", () => {
  const today = "2026-09-26";

  it("un mes cerrado va del 1 al último día y cae en su campaña", () => {
    expect(reportPeriod({ kind: "month", month: "2026-06" }, today)).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
      label: "junio de 2026",
      season: "25/26",
    });
    expect(reportPeriod({ kind: "month", month: "2024-02" }, today)?.to).toBe("2024-02-29");
  });

  it("el mes en curso llega hasta hoy; un mes futuro no vale", () => {
    expect(reportPeriod({ kind: "month", month: "2026-09" }, today)).toMatchObject({ to: today, season: "26/27" });
    expect(reportPeriod({ kind: "month", month: "2026-10" }, today)).toBeNull();
    expect(reportPeriod({ kind: "month", month: "2026-13" }, today)).toBeNull();
  });

  it("una campaña va de julio a junio y la en curso llega hasta hoy", () => {
    expect(reportPeriod({ kind: "season", season: "25/26" }, today)).toMatchObject({ from: "2025-07-01", to: "2026-06-30" });
    expect(reportPeriod({ kind: "season", season: "26/27" }, today)).toMatchObject({ from: "2026-07-01", to: today });
    expect(reportPeriod({ kind: "season", season: "26/28" }, today)).toBeNull();
  });
});
