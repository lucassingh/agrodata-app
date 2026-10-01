/** Tipos del tour guiado (Etapa 6.4), portado de `bgenai-lib-tour`. Los textos
 *  van directo en castellano (sin claves de traducción). */

export interface TourStep {
  /** Único dentro del tour. */
  id: string;
  /** Agrupa pasos que «Saltar esta sección» saltea juntos. */
  groupId: string;
  /** Valor exacto del atributo `data-tour` del elemento a resaltar. */
  target: string;
  /** `data-tour-group` a unir con el target: el paso muestra la sección entera, no solo su título. */
  unionWith?: string;
  /** `data-tour-group` de una zona más grande que solo se despeja del desenfoque (el anillo y el
   *  cartel siguen en el target). Sirve cuando el elemento vive dentro de una sección ya visible. */
  clearWith?: string;
  title?: string;
  body: string;
  placement?: TourPlacement;
  /** Nombre de una acción (de las que se pasan al arrancar) que corre al entrar al paso. */
  onEnter?: string;
}

export type TourPlacement = "top" | "bottom" | "left" | "right" | "bottom-start" | "right-start";

export interface TourStartActions {
  [actionName: string]: () => void;
}

export interface StartTourArgs<TCtx> {
  ctx: TCtx;
  actions?: TourStartActions;
}

export interface TourDefinition<TCtx> {
  id: string;
  /** Nombre de la pantalla, para el cartel («Guía de Gastos»). */
  title: string;
  /** Para qué sirve la pantalla, en una línea: lo muestra el cartel antes de arrancar. */
  intro: string;
  /** Si la pantalla abre el cartel sola la primera vez que se entra (mientras no esté visto). */
  autoStart?: boolean;
  buildSteps: (ctx: TCtx) => TourStep[];
  /** groupId → nombre de la sección en el menú «Ver guía». Uno por cada grupo que pueda salir. */
  groupLabels: Record<string, string>;
}

/** La única puerta del motor a «¿esta persona ya vio este tour?». En AgroData
 *  vive en la base (ver `tour-storage.ts`). */
export interface TourStorageAdapter {
  hasSeenTour(tourId: string): boolean;
  /** Marca un tour como visto. Idempotente. */
  markSeen(tourId: string): void;
  /** Si ya vio alguno: el primer cartel es la bienvenida completa, los siguientes van al grano. */
  hasSeenAnyTour?(): boolean;
}

export interface TourEngineConfig<TCtx> {
  registry: Record<string, TourDefinition<TCtx>>;
  storage: TourStorageAdapter;
  /** Espera antes de abrir el cartel solo, para que se asiente el layout. Default 600 ms. */
  autoStartDelayMs?: number;
  /** Al arrancar, descarta los pasos cuyo elemento no se ve (depende del rol o de los datos), salvo
   *  que el paso o uno anterior de su sección tenga `onEnter` (puede ser lo que lo muestra). Así el
   *  «Paso X de N» cuenta solo lo que se va a ver y no hay esperas por pasos que se saltean. */
  dropMissingTargets?: boolean;
}

export interface UseTourAutoStartArgs<TCtx> {
  ctx: TCtx;
  actions?: TourStartActions;
  /** Si la pantalla ya tiene lo que el tour necesita en pantalla. */
  ready: boolean;
}

export interface StartTourOpts {
  /** Arranca en el primer paso de ese grupo (desde «Ver guía»). */
  startGroupId?: string;
}

export interface WelcomePending<TCtx> {
  tourId: string;
  args: StartTourArgs<TCtx>;
  startGroupId?: string;
}

export interface ProductTourState<TCtx> {
  activeTourId: string | null;
  steps: TourStep[];
  stepIndex: number;
  actions: TourStartActions;
  welcomePending: WelcomePending<TCtx> | null;

  startTour: (tourId: string, args: StartTourArgs<TCtx>, opts?: StartTourOpts) => void;
  /** Avanza un paso; en el último, lo marca visto y cierra. */
  goNext: () => void;
  goBack: () => void;
  /** Saltea los pasos que quedan del grupo actual; sin otro grupo después, termina el tour. */
  skipGroup: () => void;
  /** Cierra el tour antes de terminar: también cuenta como visto. */
  exitTour: () => void;

  /** Pide el cartel de bienvenida antes de arrancar (no hace nada si ya hay tour o cartel). */
  openWelcome: (tourId: string, args: StartTourArgs<TCtx>, startGroupId?: string) => void;
  confirmWelcome: () => void;
  /** Descarta el cartel sin arrancar: lo marca visto para que no vuelva a abrirse solo. */
  dismissWelcome: () => void;
  /** Baja el cartel de ese tour SIN marcarlo visto: la persona se fue de la pantalla. */
  dismissWelcomeIfPending: (tourId: string) => void;
}
