"use client";

import Image from "next/image";
import { AnimatePresence, motion, useInView } from "motion/react";
import { BatteryFull, Camera, CheckCheck, ChevronLeft, FileImage, Mic, Phone, Play, Plus, Signal, Video, Wifi } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ThinkingShimmer } from "@/components/agents/loading-states/thinking-shimmer";
import { cn } from "@/lib/utils";
import { HERO_SCENES } from "./content";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Scene = (typeof HERO_SCENES)[number];

/**
 * Lotes de /landing/hero-campo.jpg (1232x821), tomados de los polígonos que
 * dibujó el usuario (fuente: docs/hero-lotes.svg). El SVG de overlay usa
 * como viewBox la porción visible de la foto (mismo encuadre que el `object-cover`), y cada polígono
 * se recorta al área visible (visiblePath) para que siempre se vea cerrado.
 * `anchor` es dónde se ubica la tarjeta del registro: al costado del lote, sin taparlo.
 */
const IMAGE_W = 1232;
const IMAGE_H = 821;
/** Encuadre vertical de la foto cuando el panel recorta: 0 = arriba, 0.5 = centro. Más arriba para ver el lote Norte. */
const FOCUS_Y = 0.15;

/** Colores y opacidades de relleno tal como los definió el usuario; el borde va al 100%. */
type Point = [number, number];

const FIELDS: { id: string; points: Point[]; color: string; fillOpacity: number; anchor: Point }[] = [
  { id: "norte", points: [[600, 2], [267, 235.5], [719.5, 308.5], [923.5, 2]], color: "#9BFF00", fillOpacity: 0.45, anchor: [560, 470] },
  { id: "bajo", points: [[404.5, 252], [94, 821], [648, 821], [713.5, 312]], color: "#F04242", fillOpacity: 0.67, anchor: [800, 520] },
  {
    id: "oeste",
    points: [[398.5, 260.471], [91.7611, 822], [0.5, 822], [0.5, 226], [264.143, 235.492]],
    color: "#2C20DB",
    fillOpacity: 0.61,
    anchor: [560, 560],
  },
];

const DEFAULT_ANCHOR: [number, number] = [1030, 160];

type Phase = "sent" | "thinking" | "done";

const TIMELINE: Record<Phase, number> = { sent: 0, thinking: 1100, done: 2600 };
const SCENE_DURATION = 7200;

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroScene() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.25 });

  const [sceneIndex, setSceneIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(reduceMotion ? "done" : "sent");
  const [panelSize, setPanelSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setPanelSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setPhase("done");
      return;
    }
    if (!inView) return;

    setPhase("sent");
    const timers = [
      setTimeout(() => setPhase("thinking"), TIMELINE.thinking),
      setTimeout(() => setPhase("done"), TIMELINE.done),
      setTimeout(() => setSceneIndex((index) => (index + 1) % HERO_SCENES.length), SCENE_DURATION),
    ];
    return () => timers.forEach(clearTimeout);
  }, [sceneIndex, inView, reduceMotion]);

  const scene = HERO_SCENES[sceneIndex] ?? HERO_SCENES[0]!;
  const activeFieldId = phase === "done" ? scene.fieldId : null;
  const anchor = FIELDS.find((field) => field.id === scene.fieldId)?.anchor ?? DEFAULT_ANCHOR;
  const cardPosition = projectAnchor(anchor, panelSize);

  return (
    <div ref={rootRef} className="relative">
      <div
        ref={panelRef}
        className="relative aspect-[1232/821] overflow-hidden rounded-[16px] bg-l-surface-2 shadow-l-lg lg:aspect-auto lg:h-[clamp(480px,62vh,660px)]"
      >
        <Image
          src="/landing/hero-campo.jpg"
          alt="Vista aérea de lotes agrícolas en distintos tonos de verde y marrón"
          fill
          priority
          sizes="(min-width: 1320px) 1240px, 100vw"
          className="object-cover"
          style={{ objectPosition: `50% ${FOCUS_Y * 100}%` }}
        />

        {/* Sin mensaje la foto queda limpia; se pinta solo el lote del mensaje en pantalla. */}
        <svg
          viewBox={visibleViewBox(panelSize)}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          <AnimatePresence>
            {FIELDS.filter((field) => field.id === activeFieldId).map((field) => (
              <motion.path
                key={`${scene.id}-${field.id}`}
                d={visiblePath(field.points, panelSize)}
                strokeLinejoin="round"
                stroke={field.color}
                strokeWidth={3 / visibleRect(panelSize).scale}
                strokeLinecap="round"
                fill={field.color}
                initial={reduceMotion ? false : { pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: field.fillOpacity }}
                exit={{ opacity: 0, transition: { duration: 0.35 } }}
                transition={{
                  pathLength: { duration: 0.9, ease: EASE },
                  fillOpacity: { duration: 0.6, delay: 0.35, ease: EASE },
                }}
              />
            ))}
          </AnimatePresence>
        </svg>

        <AnimatePresence mode="wait">
          {phase === "done" && panelSize.w > 0 && (
            <motion.div
              key={scene.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              style={{ left: cardPosition.x, top: cardPosition.y }}
              className="absolute hidden w-[228px] rounded-[16px] bg-white/95 p-4 text-l-ink shadow-l-lg backdrop-blur-sm sm:block"
            >
              <RecordCard scene={scene} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 mx-auto -mt-8 w-[260px] sm:-mt-24 lg:absolute lg:top-[-96px] lg:right-10 lg:mt-0 lg:w-[290px]">
        <PhoneChat scene={scene} phase={phase} reduceMotion={Boolean(reduceMotion)} />
      </div>
    </div>
  );
}

/** Área de la foto (en coordenadas de la imagen) que queda visible con `object-cover` centrado. */
function visibleRect({ w, h }: { w: number; h: number }) {
  if (!w || !h) return { x0: 0, y0: 0, x1: IMAGE_W, y1: IMAGE_H, scale: 1 };
  const scale = Math.max(w / IMAGE_W, h / IMAGE_H);
  const x0 = (IMAGE_W - w / scale) / 2;
  const y0 = (IMAGE_H - h / scale) * FOCUS_Y;
  return { x0, y0, x1: x0 + w / scale, y1: y0 + h / scale, scale };
}

/** viewBox del overlay = la porción de la foto que se ve, así los lotes siguen el mismo encuadre. */
function visibleViewBox(size: { w: number; h: number }) {
  const { x0, y0, x1, y1 } = visibleRect(size);
  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
}

/**
 * Recorta el polígono al área visible (Sutherland-Hodgman) para que, si el lote se
 * sale del cuadro, su borde siga el límite del panel y la forma se vea cerrada.
 */
function visiblePath(points: Point[], size: { w: number; h: number }) {
  const { x0, y0, x1, y1, scale } = visibleRect(size);
  const inset = 2 / scale;
  const edges: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(p) => p[0] >= x0 + inset, (a, b) => atX(a, b, x0 + inset)],
    [(p) => p[0] <= x1 - inset, (a, b) => atX(a, b, x1 - inset)],
    [(p) => p[1] >= y0 + inset, (a, b) => atY(a, b, y0 + inset)],
    [(p) => p[1] <= y1 - inset, (a, b) => atY(a, b, y1 - inset)],
  ];
  let poly = points;
  for (const [inside, intersect] of edges) {
    const next: Point[] = [];
    poly.forEach((current, i) => {
      const prev = poly[(i + poly.length - 1) % poly.length]!;
      if (inside(current)) {
        if (!inside(prev)) next.push(intersect(prev, current));
        next.push(current);
      } else if (inside(prev)) {
        next.push(intersect(prev, current));
      }
    });
    poly = next;
  }
  if (poly.length < 3) return "";
  return `M${poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")} Z`;
}

function atX([ax, ay]: Point, [bx, by]: Point, x: number): Point {
  return [x, ay + ((by - ay) * (x - ax)) / (bx - ax)];
}

function atY([ax, ay]: Point, [bx, by]: Point, y: number): Point {
  return [ax + ((bx - ax) * (y - ay)) / (by - ay), y];
}

/** Proyecta un punto de la foto al panel, replicando `object-cover` centrado. */
function projectAnchor([px, py]: [number, number], { w, h }: { w: number; h: number }) {
  const CARD_W = 228;
  const CARD_H = 176;
  const { x0, y0, scale } = visibleRect({ w, h });
  const x = (px - x0) * scale - CARD_W / 2;
  const y = (py - y0) * scale - CARD_H / 2;
  return {
    x: clamp(x, 16, Math.max(16, w - CARD_W - 16)),
    y: clamp(y, 16, Math.max(16, h - CARD_H - 16)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function RecordCard({ scene }: { scene: Scene }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-l-accent-tint px-2.5 py-1 text-xs font-semibold text-l-ink">
          {scene.record.type}
        </span>
        <span className="text-xs text-l-ink-soft">Registro nuevo</span>
      </div>
      <dl className="mt-3 grid gap-1.5 text-[13px]">
        {scene.record.lines.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-l-ink-soft">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function PhoneChat({ scene, phase, reduceMotion }: { scene: Scene; phase: Phase; reduceMotion: boolean }) {
  const bubbleMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 12, scale: 0.94 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
    transition: { type: "spring" as const, stiffness: 420, damping: 30 },
  };

  return (
    <div
      role="img"
      aria-label={`Chat de WhatsApp con AgroData. Mensaje: "${scene.message}". Respuesta: "${scene.reply}"`}
      className="relative aspect-[462/944] w-full drop-shadow-[0_24px_32px_oklch(0.235_0.035_162/0.28)]"
    >
      {/* Marco real de iPhone 17 (public/landing/iphone-17.svg, 462x944). */}
      <Image src="/landing/iphone-17.svg" alt="" fill priority className="select-none" />

      {/* Pantalla: rect del SVG x=21 y=16 420x912, radio 62. */}
      <div
        aria-hidden
        className="absolute flex flex-col overflow-hidden bg-[#f6f5f3]"
        style={{ left: "4.545%", top: "1.695%", width: "90.909%", height: "96.61%", borderRadius: "14.76% / 6.8%" }}
      >
        <div className="flex h-[42px] shrink-0 items-end justify-between px-6 pb-1.5 text-[12px] font-semibold text-black">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <Signal className="size-3.5" strokeWidth={2.5} />
            <Wifi className="size-3.5" strokeWidth={2.5} />
            <BatteryFull className="size-4" strokeWidth={2} />
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-black/5 px-2.5 pt-1 pb-2">
          <ChevronLeft className="size-5 text-[#007aff]" />
          <div className="flex size-8 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">
            <Image src="/brand/logo-small.png" alt="" width={93} height={110} className="h-5 w-auto" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-black">AgroData</p>
            <p className="text-[10px] text-black/55">en línea</p>
          </div>
          <Video className="size-[18px] text-[#007aff]" />
          <Phone className="ml-2 size-4 text-[#007aff]" />
        </div>

        <div className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden px-2.5 pt-3 pb-3">
          <Image src="/landing/bg-whatsapp.png" alt="" fill sizes="300px" className="object-cover" />
          <p className="relative mx-auto mb-auto rounded-md bg-white/90 px-2 py-0.5 text-[10px] text-black/55 shadow-sm">Hoy</p>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={`${scene.id}-out`} {...bubbleMotion} className="relative ml-auto max-w-[86%]">
            <OutgoingBubble scene={scene} />
          </motion.div>

          {phase === "thinking" && (
            <motion.div key={`${scene.id}-thinking`} {...bubbleMotion} className="relative max-w-[80%]">
              <div className="rounded-[10px] rounded-tl-sm bg-white px-3 py-2 text-[13px] shadow-sm">
                <ThinkingShimmer className="text-l-ink-soft">Procesando el mensaje…</ThinkingShimmer>
              </div>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div key={`${scene.id}-reply`} {...bubbleMotion} className="relative max-w-[86%]">
              <div className="rounded-[10px] rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-snug text-l-ink shadow-sm">
                {scene.reply}
                <span className="mt-1 block text-right text-[10px] text-l-ink-soft">10:42</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-2 bg-[#f6f5f3] px-3 pt-2 pb-5">
          <Plus className="size-5 text-[#007aff]" />
          <span className="flex h-7 flex-1 items-center rounded-full border border-black/10 bg-white px-3 text-[11px] text-black/35">
            Mensaje
          </span>
          <Camera className="size-[18px] text-[#007aff]" />
          <Mic className="size-[18px] text-[#007aff]" />
        </div>
      </div>

      {/* Dynamic Island, encima de la pantalla. */}
      <div
        aria-hidden
        className="absolute rounded-full bg-black"
        style={{ left: "37.2%", top: "3.3%", width: "25.6%", height: "3.6%" }}
      />
    </div>
  );
}

function OutgoingBubble({ scene }: { scene: Scene }) {
  return (
    <div className="rounded-[10px] rounded-tr-sm bg-l-wa-out px-3 py-2 text-[13px] leading-snug text-l-ink shadow-sm">
      {scene.kind === "audio" && (
        <div className="flex items-center gap-2.5 py-1">
          <Play className="size-4 fill-l-ink-soft text-l-ink-soft" />
          <Waveform />
          <span className="text-[11px] text-l-ink-soft">{scene.audioLength}</span>
          <Mic className="size-3.5 text-l-brand" />
        </div>
      )}
      {scene.kind === "photo" && (
        <div className="mb-1.5 flex items-center gap-2 rounded-md bg-white/70 p-2">
          <FileImage className="size-7 text-l-brand" strokeWidth={1.5} />
          <span className="text-[12px] text-l-ink-soft">factura_urea.jpg</span>
        </div>
      )}
      <span className={cn(scene.kind === "audio" && "block text-[12px] text-l-ink-soft italic")}>
        {scene.kind === "audio" ? `"${scene.message}"` : scene.message}
      </span>
      <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-l-ink-soft">
        10:41
        <CheckCheck className="size-3.5 text-[#53bdeb]" />
      </span>
    </div>
  );
}

/** Onda de audio: alturas fijas (no aleatorias) para que server y cliente rendericen igual. */
const WAVE = [6, 12, 8, 16, 10, 18, 7, 14, 9, 17, 11, 6, 13, 8, 15, 7, 12, 5];

function Waveform() {
  return (
    <span className="flex h-5 flex-1 items-center gap-[2px]">
      {WAVE.map((height, index) => (
        <span key={index} className="w-[2px] rounded-full bg-l-ink-soft/70" style={{ height }} />
      ))}
    </span>
  );
}
