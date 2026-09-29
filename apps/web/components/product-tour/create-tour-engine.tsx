"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createTourGuideMenu } from "./components/tour-guide-menu";
import { createTourPopover } from "./components/tour-popover";
import { createTourWelcomeDialog } from "./components/tour-welcome-dialog";
import { TourSpotlightMask } from "./components/tour-spotlight-mask";
import { DEFAULT_TOUR_AUTOSTART_DELAY_MS } from "./config";
import { findVisibleTarget } from "./hooks/use-tour-target";
import { createProductTourOverlay } from "./product-tour-overlay";
import type {
  ProductTourState,
  TourEngineConfig,
  TourStartActions,
  TourStep,
  UseTourAutoStartArgs,
} from "./types";

const runOnEnter = (step: TourStep | undefined, actions: TourStartActions) => {
  if (step?.onEnter) actions[step.onEnter]?.();
};

/** Al salir de un grupo (a otro, o al terminar o cerrar el tour estando en él)
 *  corre `exitGroup:<groupId>` si la pantalla la pasó: por ejemplo, cerrar el
 *  menú del celular que el tour había abierto. Es opcional. */
const runGroupExit = (fromStep: TourStep | undefined, toStep: TourStep | undefined, actions: TourStartActions) => {
  if (fromStep && fromStep.groupId !== toStep?.groupId) {
    actions[`exitGroup:${fromStep.groupId}`]?.();
  }
};

/** Ver `TourEngineConfig.dropMissingTargets`. */
export function keepVisibleSteps(steps: TourStep[]): TourStep[] {
  return steps.filter(
    (step, i) =>
      !!findVisibleTarget(step.target) ||
      !!step.onEnter ||
      steps.slice(0, i).some((prev) => prev.groupId === step.groupId && !!prev.onEnter),
  );
}

/**
 * Crea el motor de tours, ligado al `TCtx` (los datos de rol que usan las
 * definiciones para decidir qué pasos van) y a su registro y persistencia. Se
 * llama UNA vez (ver `engine.tsx`). Portado de `bgenai-lib-tour` con la misma
 * lógica (más la opción `dropMissingTargets`): el estado vive en un store de
 * Zustand, así cualquier componente lo lee sin pasar props.
 */
export function createTourEngine<TCtx>(config: TourEngineConfig<TCtx>) {
  const { registry, storage, autoStartDelayMs = DEFAULT_TOUR_AUTOSTART_DELAY_MS, dropMissingTargets = false } = config;

  const reset = {
    activeTourId: null as string | null,
    steps: [] as TourStep[],
    stepIndex: 0,
    actions: {} as TourStartActions,
  };

  const useTourStore = create<ProductTourState<TCtx>>((set, get) => ({
    ...reset,
    welcomePending: null,

    startTour: (tourId, { ctx, actions = {} }, opts) => {
      const definition = registry[tourId];
      if (!definition) return;
      const built = definition.buildSteps(ctx);
      const steps = dropMissingTargets ? keepVisibleSteps(built) : built;
      if (steps.length === 0) return;
      const initialIndex = opts?.startGroupId ? Math.max(steps.findIndex((s) => s.groupId === opts.startGroupId), 0) : 0;
      // Arrancar no lo marca visto: eso pasa al terminarlo o al salir.
      set({ activeTourId: tourId, steps, stepIndex: initialIndex, actions, welcomePending: null });
      runOnEnter(steps[initialIndex], actions);
    },

    goNext: () => {
      const { steps, stepIndex, activeTourId, actions } = get();
      if (!activeTourId) return;
      const current = steps[stepIndex];
      const nextIndex = stepIndex + 1;
      if (nextIndex >= steps.length) {
        runGroupExit(current, undefined, actions);
        storage.markSeen(activeTourId);
        set({ ...reset });
        return;
      }
      runGroupExit(current, steps[nextIndex], actions);
      set({ stepIndex: nextIndex });
      runOnEnter(steps[nextIndex], actions);
    },

    goBack: () => {
      const { steps, stepIndex, actions } = get();
      if (stepIndex === 0) return;
      const prevIndex = stepIndex - 1;
      runGroupExit(steps[stepIndex], steps[prevIndex], actions);
      set({ stepIndex: prevIndex });
      runOnEnter(steps[prevIndex], actions);
    },

    skipGroup: () => {
      const { steps, stepIndex, activeTourId, actions } = get();
      if (!activeTourId) return;
      const current = steps[stepIndex];
      const nextIndex = steps.findIndex((s, idx) => idx > stepIndex && s.groupId !== current?.groupId);
      if (nextIndex === -1) {
        runGroupExit(current, undefined, actions);
        storage.markSeen(activeTourId);
        set({ ...reset });
        return;
      }
      runGroupExit(current, steps[nextIndex], actions);
      set({ stepIndex: nextIndex });
      runOnEnter(steps[nextIndex], actions);
    },

    exitTour: () => {
      const { steps, stepIndex, activeTourId, actions } = get();
      if (activeTourId) {
        runGroupExit(steps[stepIndex], undefined, actions);
        storage.markSeen(activeTourId);
      }
      set({ ...reset });
    },

    openWelcome: (tourId, args, startGroupId) => {
      // Si ya hay un tour o un cartel, no hace nada: el cartel automático no pisa uno abierto a mano.
      if (get().activeTourId || get().welcomePending) return;
      set({ welcomePending: { tourId, args, startGroupId } });
    },

    confirmWelcome: () => {
      const { welcomePending } = get();
      if (!welcomePending) return;
      get().startTour(welcomePending.tourId, welcomePending.args, { startGroupId: welcomePending.startGroupId });
    },

    dismissWelcome: () => {
      const { welcomePending } = get();
      if (welcomePending) storage.markSeen(welcomePending.tourId);
      set({ welcomePending: null });
    },

    // Irse de la pantalla no es rechazar el tour: se baja el cartel sin marcarlo
    // visto, y se vuelve a ofrecer la próxima vez que entre.
    dismissWelcomeIfPending: (tourId) => {
      if (get().welcomePending?.tourId === tourId) set({ welcomePending: null });
    },
  }));

  const useActiveTourTarget = (): string | null =>
    useTourStore((s) => (s.activeTourId ? (s.steps[s.stepIndex]?.target ?? null) : null));

  /** Abre el cartel de la pantalla la primera vez que se entra. */
  const useTourAutoStart = (tourId: string, { ctx, actions, ready }: UseTourAutoStartArgs<TCtx>) => {
    const openWelcome = useTourStore((s) => s.openWelcome);
    const dismissWelcomeIfPending = useTourStore((s) => s.dismissWelcomeIfPending);

    useEffect(() => {
      if (!ready || !registry[tourId]?.autoStart) return;
      if (storage.hasSeenTour(tourId)) return;
      // La espera deja asentar el layout, para que el primer spotlight no salte.
      const timer = window.setTimeout(() => openWelcome(tourId, { ctx, actions }), autoStartDelayMs);
      return () => {
        window.clearTimeout(timer);
        // El cartel vive en el provider: si la persona se va sin responderlo, se baja acá.
        dismissWelcomeIfPending(tourId);
      };
      // Solo al cambiar de pantalla o al estar lista: ctx y actions se leen al abrir.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, tourId]);
  };

  const TourPopover = createTourPopover(useTourStore);
  const TourWelcomeDialog = createTourWelcomeDialog(useTourStore, registry, storage);
  const TourGuideMenu = createTourGuideMenu(useTourStore, registry);
  const ProductTourOverlay = createProductTourOverlay(useTourStore, TourSpotlightMask, TourPopover);

  /** Se monta una vez, en el layout del dashboard: el overlay y el cartel. */
  function ProductTourLayer() {
    return (
      <>
        <ProductTourOverlay />
        <TourWelcomeDialog />
      </>
    );
  }

  return { useTourStore, useActiveTourTarget, useTourAutoStart, ProductTourLayer, TourGuideMenu };
}

export type TourEngine<TCtx> = ReturnType<typeof createTourEngine<TCtx>>;
