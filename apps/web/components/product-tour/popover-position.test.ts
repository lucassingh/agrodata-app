import { describe, expect, it } from "vitest";
import { placePopover, POPOVER_OFFSET, VIEWPORT_PADDING } from "./popover-position";

const viewport = { width: 1200, height: 800 };
const size = { width: 320, height: 180 };

describe("dónde va el cartel del paso", () => {
  it("abajo y alineado al inicio cuando entra", () => {
    const anchor = { top: 100, left: 200, width: 300, height: 40 };
    expect(placePopover(anchor, size, "bottom-start", viewport)).toEqual({ side: "bottom", top: 140 + POPOVER_OFFSET, left: 200 });
  });

  it("centrado cuando el lado no es «-start»", () => {
    const anchor = { top: 100, left: 400, width: 400, height: 40 };
    expect(placePopover(anchor, size, "bottom", viewport).left).toBe(400 + (400 - 320) / 2);
  });

  it("se da vuelta arriba si abajo no entra", () => {
    const anchor = { top: 700, left: 200, width: 300, height: 40 };
    const result = placePopover(anchor, size, "bottom-start", viewport);
    expect(result.side).toBe("top");
    expect(result.top).toBe(700 - POPOVER_OFFSET - 180);
  });

  it("a la derecha del menú; a la izquierda si no hay lugar", () => {
    const menuItem = { top: 200, left: 0, width: 260, height: 40 };
    expect(placePopover(menuItem, size, "right-start", viewport)).toMatchObject({ side: "right", left: 260 + POPOVER_OFFSET, top: 200 });
    const nearRight = { top: 200, left: 1000, width: 150, height: 40 };
    expect(placePopover(nearRight, size, "right", viewport).side).toBe("left");
  });

  it("nunca se sale de la pantalla (celular)", () => {
    const phone = { width: 375, height: 700 };
    const anchor = { top: 80, left: 300, width: 60, height: 40 };
    const result = placePopover(anchor, { width: 343, height: 200 }, "bottom-start", phone);
    expect(result.left).toBe(VIEWPORT_PADDING);
    expect(result.left + 343).toBeLessThanOrEqual(375 - VIEWPORT_PADDING);
  });

  it("un elemento más alto que la pantalla: queda del lado pedido, dentro de la pantalla", () => {
    const tall = { top: 20, left: 20, width: 1160, height: 760 };
    const result = placePopover(tall, size, "bottom", viewport);
    expect(result.top).toBe(viewport.height - 180 - VIEWPORT_PADDING);
  });
});
