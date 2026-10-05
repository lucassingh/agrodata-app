"use client";

import { Compass } from "lucide-react";
import type { StoreApi, UseBoundStore } from "zustand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProductTourState, TourDefinition, TourStorageAdapter } from "../types";

const HOW_IT_WORKS = [
  "La volvés a abrir cuando quieras con «Ver guía», arriba a la derecha.",
  "Desde ese mismo botón podés ir directo a una sección, sin recorrer todo.",
  "Si una sección no te interesa, la salteás entera.",
  "Podés ir y volver entre los pasos, también con el teclado (Enter avanza, Escape sale).",
  "Si salís, no se vuelve a abrir sola.",
];

/** El cartel antes de arrancar un tour completo (el automático de la primera
 *  visita o «Guía completa»). La primera vez es la bienvenida con cómo se usa la
 *  guía; después, va al grano con la pantalla. */
export function createTourWelcomeDialog<TCtx>(
  useTourStore: UseBoundStore<StoreApi<ProductTourState<TCtx>>>,
  registry: Record<string, TourDefinition<TCtx>>,
  storage: TourStorageAdapter,
) {
  return function TourWelcomeDialog() {
    const welcomePending = useTourStore((s) => s.welcomePending);
    const confirmWelcome = useTourStore((s) => s.confirmWelcome);
    const dismissWelcome = useTourStore((s) => s.dismissWelcome);

    if (!welcomePending) return null;
    const definition = registry[welcomePending.tourId];
    if (!definition) return null;
    const firstTime = !(storage.hasSeenAnyTour?.() ?? true);

    return (
      <Dialog open onOpenChange={(open: boolean) => !open && dismissWelcome()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-accent text-primary">
                <Compass size={18} aria-hidden />
              </span>
              <DialogTitle className="font-heading text-lg">
                {firstTime ? "Te mostramos Campia" : `Guía de ${definition.title}`}
              </DialogTitle>
            </div>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              {firstTime
                ? `Un recorrido corto por lo principal, para que arranques bien. En esta pantalla, ${definition.title}: ${definition.intro}`
                : definition.intro}
            </DialogDescription>
          </DialogHeader>

          {firstTime ? (
            <ul className="space-y-2">
              {HOW_IT_WORKS.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Podés volver a verla cuando quieras desde «Ver guía».</p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={dismissWelcome}>
              Ahora no
            </Button>
            <Button onClick={confirmWelcome} autoFocus>
              {firstTime ? "Empezar el recorrido" : "Ver la guía"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
}
