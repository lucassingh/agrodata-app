"use client";

import { useMemo } from "react";
import { Compass } from "lucide-react";
import type { StoreApi, UseBoundStore } from "zustand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTourSections } from "../get-tour-sections";
import type { ProductTourState, TourDefinition, TourStartActions } from "../types";

interface TourGuideMenuProps<TCtx> {
  tourId: string;
  ctx: TCtx;
  actions: TourStartActions;
}

/** El botón «Ver guía» del encabezado, con las secciones de la pantalla: una
 *  sección arranca directo ahí; «Guía completa» pasa por el cartel. Sin tour para
 *  la pantalla, no se muestra. */
export function createTourGuideMenu<TCtx>(
  useTourStore: UseBoundStore<StoreApi<ProductTourState<TCtx>>>,
  registry: Record<string, TourDefinition<TCtx>>,
) {
  return function TourGuideMenu({ tourId, ctx, actions }: TourGuideMenuProps<TCtx>) {
    const openWelcome = useTourStore((s) => s.openWelcome);
    const startTour = useTourStore((s) => s.startTour);
    const definition = registry[tourId];
    const sections = useMemo(() => (definition ? getTourSections(definition, ctx) : []), [definition, ctx]);

    if (!definition || sections.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          data-tour="shell.header.guide"
          aria-label={`Ver guía de ${definition.title}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-accent px-2.5 text-xs font-semibold text-primary-dark transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Compass size={16} aria-hidden />
          <span className="hidden sm:inline">Ver guía</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] font-bold tracking-wide text-primary uppercase">
              Guía de {definition.title}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openWelcome(tourId, { ctx, actions })} className="flex-col items-start gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <Compass size={14} className="text-primary" aria-hidden />
                Guía completa
              </span>
              <span className="pl-5 text-xs text-muted-foreground">Todas las secciones, en orden.</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {sections.map((section) => (
              <DropdownMenuItem key={section.groupId} onClick={() => startTour(tourId, { ctx, actions }, { startGroupId: section.groupId })}>
                {section.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
}
