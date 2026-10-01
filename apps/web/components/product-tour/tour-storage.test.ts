import { beforeEach, describe, expect, it, vi } from "vitest";

const markTourSeenAction = vi.fn(() => Promise.resolve());
vi.mock("@/app/dashboard/(app)/_lib/tour-actions", () => ({ markTourSeenAction }));

const { tourStorage } = await import("./tour-storage");

describe("guardado del avance en la base", () => {
  beforeEach(() => markTourSeenAction.mockClear());

  it("arranca con lo que viene del servidor", () => {
    tourStorage.hydrate("ana", ["gastos"]);
    expect(tourStorage.hasSeenTour("gastos")).toBe(true);
    expect(tourStorage.hasSeenTour("insumos")).toBe(false);
    expect(tourStorage.hasSeenAnyTour?.()).toBe(true);
  });

  it("marcar es optimista y va una sola vez a la base", () => {
    tourStorage.hydrate("beto", []);
    expect(tourStorage.hasSeenAnyTour?.()).toBe(false);
    tourStorage.markSeen("insumos");
    tourStorage.markSeen("insumos");
    expect(tourStorage.hasSeenTour("insumos")).toBe(true);
    expect(markTourSeenAction).toHaveBeenCalledTimes(1);
    expect(markTourSeenAction).toHaveBeenCalledWith("insumos");
  });

  it("con otra persona en la sesión, se reemplaza la lista; con la misma, no se pisa", () => {
    tourStorage.hydrate("carla", ["resumen"]);
    tourStorage.markSeen("datos");
    tourStorage.hydrate("carla", ["resumen"]); // el layout se vuelve a renderizar
    expect(tourStorage.hasSeenTour("datos")).toBe(true);
    tourStorage.hydrate("dani", []);
    expect(tourStorage.hasSeenTour("resumen")).toBe(false);
  });

  it("si la red falla, no rompe nada", () => {
    tourStorage.hydrate("eva", []);
    markTourSeenAction.mockImplementationOnce(() => Promise.reject(new Error("sin red")));
    expect(() => tourStorage.markSeen("tambo")).not.toThrow();
  });
});
