import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTourTarget } from "./use-tour-target";

/** jsdom no tiene un requestAnimationFrame controlable con timers falsos: se
 *  reemplaza por un setTimeout de 16 ms, así cada «cuadro» es determinístico. */
const stubRaf = () => {
  vi.stubGlobal("requestAnimationFrame", ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16)) as unknown as typeof requestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", ((id: number) => clearTimeout(id)) as unknown as typeof cancelAnimationFrame);
};

const addTarget = (name: string) => {
  const el = document.createElement("div");
  el.setAttribute("data-tour", name);
  // jsdom no calcula cajas: se marca como visible.
  el.getClientRects = () => ({ length: 1 }) as unknown as DOMRectList;
  document.body.appendChild(el);
  return el;
};

describe("seguir el elemento del paso", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubRaf();
    document.body.innerHTML = "";
    Element.prototype.scrollIntoView = vi.fn(); // jsdom no lo tiene
  });

  afterEach(() => {
    // Desmontar antes de devolver los timers reales: el loop cancela su cuadro con el stub.
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("lo muestra recién cuando quedó quieto unos cuadros", () => {
    addTarget("foo");
    const onNotFound = vi.fn();
    const { result } = renderHook(() => useTourTarget("foo", undefined, undefined, onNotFound));
    expect(result.current.rect).toBeNull();
    act(() => vi.advanceTimersByTime(16 * 4));
    expect(result.current.rect).not.toBeNull();
    expect(result.current.resolvedFor).toBe("foo");
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it("un elemento oculto (sin cajas) cuenta como que no está", () => {
    const hidden = document.createElement("div");
    hidden.setAttribute("data-tour", "hidden");
    document.body.appendChild(hidden);
    const onNotFound = vi.fn();
    renderHook(() => useTourTarget("hidden", undefined, undefined, onNotFound));
    act(() => vi.advanceTimersByTime(1000));
    expect(onNotFound).toHaveBeenCalledTimes(1);
  });

  it("si el elemento no aparece a tiempo, avisa (el paso se saltea)", () => {
    const onNotFound = vi.fn();
    renderHook(() => useTourTarget("missing", undefined, undefined, onNotFound));
    act(() => vi.advanceTimersByTime(1000));
    expect(onNotFound).toHaveBeenCalledTimes(1);
  });

  it("si aparece durante la espera, no avisa", () => {
    const onNotFound = vi.fn();
    renderHook(() => useTourTarget("late", undefined, undefined, onNotFound));
    act(() => vi.advanceTimersByTime(200));
    addTarget("late");
    act(() => vi.advanceTimersByTime(16 * 5));
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it("si el elemento desaparece (cambió la pantalla), avisa", () => {
    const el = addTarget("gone");
    const onNotFound = vi.fn();
    renderHook(() => useTourTarget("gone", undefined, undefined, onNotFound));
    act(() => vi.advanceTimersByTime(16 * 4));
    el.remove();
    act(() => vi.advanceTimersByTime(32));
    expect(onNotFound).toHaveBeenCalledTimes(1);
  });

  it("sin target, queda vacío y no arranca ninguna espera", () => {
    const onNotFound = vi.fn();
    const { result } = renderHook(() => useTourTarget(null, undefined, undefined, onNotFound));
    expect(result.current).toEqual({ rect: null, clearRect: null, resolvedFor: null });
    act(() => vi.advanceTimersByTime(2000));
    expect(onNotFound).not.toHaveBeenCalled();
  });
});
