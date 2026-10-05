import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createTourEngine } from "./create-tour-engine";
import type { TourDefinition, TourStorageAdapter } from "./types";

interface Ctx {
  isAdmin: boolean;
}

const makeStorage = (seenAny = false): TourStorageAdapter => ({
  hasSeenTour: () => false,
  markSeen: () => {},
  hasSeenAnyTour: () => seenAny,
});

const definition = (steps: TourDefinition<Ctx>["buildSteps"]): TourDefinition<Ctx> => ({
  id: "gastos",
  title: "Gastos",
  intro: "todo lo que se gasta en el campo.",
  groupLabels: { lista: "El detalle" },
  buildSteps: steps,
});

const oneStep: TourDefinition<Ctx>["buildSteps"] = () => [
  { id: "s1", groupId: "lista", target: "gastos.table", title: "La tabla", body: "Cada gasto con su categoría." },
];

afterEach(cleanup);

describe("interfaz del tour", () => {
  it("la capa se monta sin tour activo sin mostrar nada", () => {
    const engine = createTourEngine<Ctx>({ registry: {}, storage: makeStorage() });
    render(
      <>
        <div>contenido</div>
        <engine.ProductTourLayer />
      </>,
    );
    expect(screen.getByText("contenido")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("«Ver guía» no aparece si la pantalla no tiene secciones", () => {
    const engine = createTourEngine<Ctx>({ registry: { gastos: definition(() => []) }, storage: makeStorage() });
    render(<engine.TourGuideMenu tourId="gastos" ctx={{ isAdmin: false }} actions={{}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("«Ver guía» muestra la guía completa y cada sección", async () => {
    const engine = createTourEngine<Ctx>({ registry: { gastos: definition(oneStep) }, storage: makeStorage() });
    render(<engine.TourGuideMenu tourId="gastos" ctx={{ isAdmin: false }} actions={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver guía de Gastos" }));
    expect(await screen.findByText("Guía completa")).toBeInTheDocument();
    expect(screen.getByText("El detalle")).toBeInTheDocument();
  });

  it("la primera vez el cartel es la bienvenida; después va al grano", () => {
    const first = createTourEngine<Ctx>({ registry: { gastos: definition(oneStep) }, storage: makeStorage(false) });
    render(<first.ProductTourLayer />);
    act(() => first.useTourStore.getState().openWelcome("gastos", { ctx: { isAdmin: false } }));
    expect(screen.getByText("Te mostramos Campia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Empezar el recorrido" })).toBeInTheDocument();
    cleanup();

    const later = createTourEngine<Ctx>({ registry: { gastos: definition(oneStep) }, storage: makeStorage(true) });
    render(<later.ProductTourLayer />);
    act(() => later.useTourStore.getState().openWelcome("gastos", { ctx: { isAdmin: false } }));
    expect(screen.getByText("Guía de Gastos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver la guía" }));
    expect(later.useTourStore.getState().activeTourId).toBe("gastos");
  });
});
