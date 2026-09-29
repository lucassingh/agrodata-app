import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTourEngine } from "./create-tour-engine";
import type { TourDefinition, TourStorageAdapter } from "./types";

interface Ctx {
  isAdmin: boolean;
}

const makeDefinition = (): TourDefinition<Ctx> => ({
  id: "demo",
  title: "Demo",
  intro: "una pantalla de prueba.",
  autoStart: true,
  groupLabels: { a: "Sección A", b: "Sección B" },
  buildSteps: (ctx) => [
    { id: "a1", groupId: "a", target: "a1", body: "a1" },
    { id: "a2", groupId: "a", target: "a2", body: "a2" },
    { id: "b1", groupId: "b", target: "b1", body: "b1" },
    ...(ctx.isAdmin ? [{ id: "b2", groupId: "b", target: "b2", body: "b2" }] : []),
  ],
});

const makeStorage = (): TourStorageAdapter & { seen: Set<string> } => {
  const seen = new Set<string>();
  return { seen, hasSeenTour: (id) => seen.has(id), markSeen: (id) => void seen.add(id) };
};

const makeEngine = () => {
  const storage = makeStorage();
  const engine = createTourEngine<Ctx>({ registry: { demo: makeDefinition() }, storage });
  return { storage, engine, store: () => engine.useTourStore.getState() };
};

describe("motor del tour", () => {
  it("arrancar arma los pasos con el contexto y no marca visto", () => {
    const { storage, store } = makeEngine();
    store().startTour("demo", { ctx: { isAdmin: false } });
    expect(store().activeTourId).toBe("demo");
    expect(store().steps.map((s) => s.id)).toEqual(["a1", "a2", "b1"]);
    expect(store().stepIndex).toBe(0);
    expect(storage.seen.size).toBe(0);
  });

  it("arranca en una sección puntual (desde «Ver guía»)", () => {
    const { store } = makeEngine();
    store().startTour("demo", { ctx: { isAdmin: false } }, { startGroupId: "b" });
    expect(store().steps[store().stepIndex]?.id).toBe("b1");
  });

  it("saltar sección va al primer paso de la siguiente", () => {
    const { store } = makeEngine();
    store().startTour("demo", { ctx: { isAdmin: true } });
    store().skipGroup();
    expect(store().steps[store().stepIndex]?.id).toBe("b1");
    expect(store().activeTourId).toBe("demo");
  });

  it("saltar la última sección termina el tour y lo marca visto", () => {
    const { storage, store } = makeEngine();
    store().startTour("demo", { ctx: { isAdmin: false } });
    store().skipGroup();
    store().skipGroup();
    expect(store().activeTourId).toBeNull();
    expect(storage.seen.has("demo")).toBe(true);
  });

  it("salir a mitad de camino cierra y marca visto", () => {
    const { storage, store } = makeEngine();
    store().startTour("demo", { ctx: { isAdmin: false } });
    store().exitTour();
    expect(store().activeTourId).toBeNull();
    expect(store().steps).toEqual([]);
    expect(storage.seen.has("demo")).toBe(true);
  });

  it("siguiente en el último paso termina y marca visto; atrás en el primero no hace nada", () => {
    const { storage, store } = makeEngine();
    store().startTour("demo", { ctx: { isAdmin: false } });
    store().goBack();
    expect(store().stepIndex).toBe(0);
    store().goNext();
    store().goNext();
    store().goNext();
    expect(store().activeTourId).toBeNull();
    expect(storage.seen.has("demo")).toBe(true);
  });

  it("corre onEnter al entrar al paso y exitGroup solo al cambiar de sección", () => {
    const definition = makeDefinition();
    const withEnter: TourDefinition<Ctx> = {
      ...definition,
      buildSteps: (ctx) => definition.buildSteps(ctx).map((s) => (s.id === "b1" ? { ...s, onEnter: "openMenu" } : s)),
    };
    const engine = createTourEngine<Ctx>({ registry: { demo: withEnter }, storage: makeStorage() });
    const store = () => engine.useTourStore.getState();
    const exitA = vi.fn();
    const openMenu = vi.fn();
    store().startTour("demo", { ctx: { isAdmin: false }, actions: { "exitGroup:a": exitA, openMenu } });
    store().goNext(); // a1 → a2, misma sección
    expect(exitA).not.toHaveBeenCalled();
    store().goNext(); // a2 → b1, cambia de sección
    expect(exitA).toHaveBeenCalledTimes(1);
    expect(openMenu).toHaveBeenCalledTimes(1);
  });

  it("con dropMissingTargets arranca sin los pasos que no se ven, salvo los que muestra un onEnter", () => {
    document.body.innerHTML = "";
    for (const name of ["a1", "b1"]) {
      const el = document.createElement("div");
      el.setAttribute("data-tour", name);
      el.getClientRects = () => ({ length: 1 }) as unknown as DOMRectList;
      document.body.appendChild(el);
    }
    const definition: TourDefinition<Ctx> = {
      ...makeDefinition(),
      buildSteps: () => [
        { id: "a1", groupId: "a", target: "a1", body: "a1" },
        { id: "a2", groupId: "a", target: "a2", body: "no está" },
        { id: "b0", groupId: "b", target: "tab", body: "la pestaña", onEnter: "showTab" },
        { id: "b1", groupId: "b", target: "b1", body: "b1" },
        { id: "b2", groupId: "b", target: "b2", body: "la muestra el onEnter de b0" },
      ],
    };
    const engine = createTourEngine<Ctx>({ registry: { demo: definition }, storage: makeStorage(), dropMissingTargets: true });
    engine.useTourStore.getState().startTour("demo", { ctx: { isAdmin: false } });
    expect(engine.useTourStore.getState().steps.map((s) => s.id)).toEqual(["a1", "b0", "b1", "b2"]);
    document.body.innerHTML = "";
  });

  it("el cartel no se abre si ya hay un tour activo", () => {
    const { store } = makeEngine();
    store().startTour("demo", { ctx: { isAdmin: false } });
    store().openWelcome("demo", { ctx: { isAdmin: false } });
    expect(store().welcomePending).toBeNull();
  });

  it("confirmar el cartel arranca; «Ahora no» marca visto sin arrancar", () => {
    const { storage, store } = makeEngine();
    store().openWelcome("demo", { ctx: { isAdmin: false } });
    expect(store().welcomePending?.tourId).toBe("demo");
    store().confirmWelcome();
    expect(store().activeTourId).toBe("demo");
    store().exitTour();
    storage.seen.clear();

    store().openWelcome("demo", { ctx: { isAdmin: false } });
    store().dismissWelcome();
    expect(store().welcomePending).toBeNull();
    expect(store().activeTourId).toBeNull();
    expect(storage.seen.has("demo")).toBe(true);
  });

  it("irse de la pantalla baja el cartel sin marcarlo visto", () => {
    const { storage, store } = makeEngine();
    store().openWelcome("demo", { ctx: { isAdmin: false } });
    store().dismissWelcomeIfPending("demo");
    expect(store().welcomePending).toBeNull();
    expect(storage.seen.has("demo")).toBe(false);
  });

  it("useActiveTourTarget sigue al paso activo", () => {
    const { engine, store } = makeEngine();
    const { result } = renderHook(() => engine.useActiveTourTarget());
    expect(result.current).toBeNull();
    act(() => store().startTour("demo", { ctx: { isAdmin: false } }));
    expect(result.current).toBe("a1");
    act(() => store().goNext());
    expect(result.current).toBe("a2");
  });

  it("el cartel automático sale una sola vez: no con la guía ya vista", () => {
    vi.useFakeTimers();
    try {
      const { storage, engine, store } = makeEngine();
      const hook = renderHook(() => engine.useTourAutoStart("demo", { ctx: { isAdmin: false }, ready: true }));
      act(() => vi.advanceTimersByTime(700));
      expect(store().welcomePending?.tourId).toBe("demo");
      hook.unmount(); // se fue de la pantalla
      expect(store().welcomePending).toBeNull();

      storage.seen.add("demo");
      renderHook(() => engine.useTourAutoStart("demo", { ctx: { isAdmin: false }, ready: true }));
      act(() => vi.advanceTimersByTime(700));
      expect(store().welcomePending).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
