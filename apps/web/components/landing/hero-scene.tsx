"use client";

import Image from "next/image";
import { AnimatePresence, motion, useInView } from "motion/react";
import {
  BatteryFull,
  Camera,
  CheckCheck,
  ChevronLeft,
  FileImage,
  Mic,
  Phone,
  Play,
  Plus,
  SendHorizontal,
  Signal,
  Video,
  Wifi,
} from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ThinkingShimmer } from "@/components/agents/loading-states/thinking-shimmer";
import { cn } from "@/lib/utils";
import { HERO_SCENES } from "./content";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Scene = (typeof HERO_SCENES)[number];
type Point = [number, number];

/**
 * Foto del hero: /landing/hero-aerea.jpg (2000x1116, Freepik Premium). Los lotes y
 * sus colores salen del SVG que armó el usuario (docs/hero-lotes.svg). Cada lote
 * tiene además, en coordenadas de la foto, el punto de donde sale la línea
 * guía (`dot`), el codo (`elbow`) y dónde toca la tarjeta (`end`): una diagonal
 * corta hacia arriba a la derecha y un tramo horizontal, con la tarjeta a la
 * derecha, sin tapar su lote ni el teléfono. Se ve una escena por vez: lote,
 * línea y tarjeta aparecen juntos y se van cuando llega el mensaje siguiente.
 */
const IMAGE_W = 2000;
const IMAGE_H = 1116;
/** Encuadre vertical cuando el panel recorta la foto: 0 = arriba, 1 = abajo. */
const FOCUS_Y = 0.4;

interface Lot {
  id: string;
  points: Point[];
  color: string;
  fillOpacity: number;
  dot: Point;
  elbow: Point;
  end: Point;
  side: "left" | "right";
}

const LOTS: Lot[] = [
  {
    id: "norte",
    points: [[380, 439.5], [244, 606], [872.5, 524.5], [804.5, 405.5]],
    color: "#BA5C41",
    fillOpacity: 0.74,
    dot: [640, 500],
    elbow: [800, 340],
    end: [880, 340],
    side: "right",
  },
  {
    id: "bajo",
    points: [[668.5, 569], [757, 895], [1399, 796.5], [1559, 674], [1090, 518]],
    color: "#625F9F",
    fillOpacity: 0.71,
    dot: [950, 680],
    elbow: [1150, 420],
    end: [1210, 420],
    side: "right",
  },
  {
    id: "oeste",
    points: [[655, 569], [743.5, 891.5], [9.5, 986.5], [9.5, 827], [230.5, 613]],
    color: "#9BFF00",
    fillOpacity: 0.42,
    dot: [500, 820],
    elbow: [690, 630],
    end: [760, 630],
    side: "right",
  },
];

/** Tarjeta del registro (px). */
const CARD_W = 228;
const CARD_H = 170;
/** En escritorio el teléfono se apoya arriba a la derecha del panel: las tarjetas no pasan por abajo. */
const PHONE_RESERVE = 40 + 290 + 16;

type Phase = "typing" | "sent" | "thinking" | "done";

/** Momentos de cada escena (ms): se carga el mensaje, se envía, se procesa y se registra. */
const TIMELINE = { sent: 1500, thinking: 2300, done: 3500 } as const;
const SCENE_DURATION = 8200;
/** Después de la última escena pasa un segundo más y vuelve la primera. */
const LAST_SCENE_DURATION = SCENE_DURATION + 1000;

const EASE = [0.16, 1, 0.3, 1] as const;
const BRAND_LINE = "#52B788";
const BRAND_DARK = "#2D6A4F";

function useIsLg() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia("(min-width: 1024px)");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

export function HeroScene() {
  const reduceMotion = Boolean(usePrefersReducedMotion());
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.25 });
  const isLg = useIsLg();
  const uid = useId().replace(/:/g, "");

  const [cycle, setCycle] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
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

  // Con movimiento reducido: la primera escena, quieta y ya registrada.
  const lastIndex = HERO_SCENES.length - 1;
  const current = reduceMotion ? 0 : sceneIndex;
  const currentPhase: Phase = reduceMotion ? "done" : phase;
  const scene = HERO_SCENES[current] ?? HERO_SCENES[0]!;

  useEffect(() => {
    if (reduceMotion || !inView) return;
    setPhase("typing");
    setTyped(0);
    const isLast = sceneIndex === lastIndex;
    const timers = [
      setTimeout(() => setPhase("sent"), TIMELINE.sent),
      setTimeout(() => setPhase("thinking"), TIMELINE.thinking),
      setTimeout(() => setPhase("done"), TIMELINE.done),
      setTimeout(
        () => {
          // Todo junto: la escena nueva arranca cargando, sin un cuadro con la anterior ya registrada.
          if (isLast) setCycle((c) => c + 1);
          setPhase("typing");
          setTyped(0);
          setSceneIndex(isLast ? 0 : sceneIndex + 1);
        },
        isLast ? LAST_SCENE_DURATION : SCENE_DURATION,
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [sceneIndex, inView, reduceMotion, lastIndex]);

  // El mensaje se escribe letra por letra en la caja de texto, antes de enviarse.
  useEffect(() => {
    if (reduceMotion || phase !== "typing") return;
    const total = scene.message.length;
    const step = Math.max(18, Math.floor((TIMELINE.sent - 300) / total));
    const interval = setInterval(() => setTyped((n) => (n >= total ? n : n + 1)), step);
    return () => clearInterval(interval);
  }, [phase, scene.message, reduceMotion]);

  // Una escena por vez: su lote, su línea y su tarjeta, cuando el mensaje ya se registró.
  const cardScenes = currentPhase === "done" ? [scene] : [];
  const shownLots = cardScenes.map((s) => LOTS.find((lot) => lot.id === s.fieldId)!).filter(Boolean);
  const reservedRight = isLg ? PHONE_RESERVE : 16;

  return (
    <div ref={rootRef} className="relative">
      <div
        ref={panelRef}
        className="relative aspect-[2000/1116] overflow-hidden rounded-[16px] bg-l-surface-2 shadow-l-lg lg:aspect-auto lg:h-[clamp(480px,62vh,660px)]"
      >
        <Image
          src="/landing/hero-aerea.jpg"
          alt="Vista aérea de un campo con lotes de distintos cultivos"
          fill
          priority
          sizes="(min-width: 1600px) 1536px, 100vw"
          className="object-cover"
          style={{ objectPosition: `50% ${FOCUS_Y * 100}%` }}
        />

        {/* Lotes: se pintan con un barrido que sale del punto de la línea guía y después se marca el borde. */}
        <svg viewBox={visibleViewBox(panelSize)} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <AnimatePresence>
            {panelSize.w > 0 &&
              shownLots.map((lot) => {
                const d = visiblePath(lot.points, panelSize);
                const clipId = `${uid}-${cycle}-${lot.id}`;
                return (
                  <motion.g key={`${cycle}-${lot.id}`} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                    <clipPath id={clipId}>
                      <motion.circle
                        cx={lot.dot[0]}
                        cy={lot.dot[1]}
                        initial={reduceMotion ? false : { r: 0 }}
                        animate={{ r: sweepRadius(lot) }}
                        transition={{ duration: 0.95, ease: EASE }}
                      />
                    </clipPath>
                    <path d={d} fill={lot.color} fillOpacity={lot.fillOpacity} clipPath={`url(#${clipId})`} />
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={lot.color}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1, delay: 0.25, ease: EASE }}
                    />
                  </motion.g>
                );
              })}
          </AnimatePresence>
        </svg>

        {/* Líneas guía y tarjetas: solo en escritorio, donde el teléfono no tapa la foto. */}
        {isLg && panelSize.w > 0 ? (
          <>
            <svg viewBox={`0 0 ${panelSize.w} ${panelSize.h}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
              <AnimatePresence>
                {cardScenes.map((s) => {
                  const lot = LOTS.find((l) => l.id === s.fieldId)!;
                  const g = cardGeometry(lot, panelSize, reservedRight);
                  const live = s.id === scene.id;
                  return (
                    <motion.g key={`${cycle}-${s.id}`} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
                      <motion.path
                        d={`M${g.dot.join(" ")} L${g.elbow.join(" ")} L${g.end.join(" ")}`}
                        fill="none"
                        stroke={BRAND_LINE}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: "drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.5))" }}
                        initial={reduceMotion ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.65, delay: 0.45, ease: [0.65, 0, 0.35, 1] }}
                      />
                      {live && !reduceMotion ? (
                        <motion.circle
                          cx={g.dot[0]}
                          cy={g.dot[1]}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={2}
                          initial={{ r: 6, opacity: 0.9 }}
                          animate={{ r: 22, opacity: 0 }}
                          transition={{ duration: 1.6, delay: 0.5, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" }}
                        />
                      ) : null}
                      <motion.circle
                        cx={g.dot[0]}
                        cy={g.dot[1]}
                        r={6}
                        fill="#ffffff"
                        stroke={BRAND_DARK}
                        strokeWidth={3}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        initial={reduceMotion ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.3 }}
                      />
                      <motion.circle
                        cx={g.end[0]}
                        cy={g.end[1]}
                        r={3.5}
                        fill={BRAND_LINE}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: 1.05 }}
                      />
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </svg>

            <AnimatePresence>
              {cardScenes.map((s) => {
                const lot = LOTS.find((l) => l.id === s.fieldId)!;
                const g = cardGeometry(lot, panelSize, reservedRight);
                return (
                  <motion.div
                    key={`${cycle}-${s.id}`}
                    initial={reduceMotion ? false : { opacity: 0, x: lot.side === "right" ? -10 : 10, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.3 } }}
                    transition={{ type: "spring", stiffness: 340, damping: 28, delay: reduceMotion ? 0 : 1.0 }}
                    style={{ left: g.left, top: g.top, width: CARD_W }}
                    className="absolute rounded-[16px] bg-white/95 p-4 text-l-ink shadow-l-lg backdrop-blur-sm"
                  >
                    <RecordCard scene={s} color={lot.color} animate={!reduceMotion} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto -mt-8 w-[260px] sm:-mt-24 lg:absolute lg:top-[-96px] lg:right-10 lg:mt-0 lg:w-[290px]">
        <PhoneChat
          key={cycle}
          current={current}
          phase={currentPhase}
          typed={reduceMotion ? scene.message.length : typed}
          reduceMotion={reduceMotion}
        />
      </div>
    </div>
  );
}

/** Área de la foto (en coordenadas de la imagen) que queda visible con `object-cover`. */
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

/** Radio que cubre todo el lote desde el punto de la línea: hasta ahí crece el barrido. */
function sweepRadius(lot: Lot) {
  return Math.max(...lot.points.map(([x, y]) => Math.hypot(x - lot.dot[0], y - lot.dot[1]))) + 8;
}

/**
 * Dónde van la línea y la tarjeta en el panel (px). La tarjeta se ubica al final
 * de la línea y se corre para no salirse del panel ni meterse abajo del teléfono;
 * el tramo horizontal de la línea siempre llega a su costado.
 */
function cardGeometry(lot: Lot, size: { w: number; h: number }, reservedRight: number) {
  const { x0, y0, scale } = visibleRect(size);
  const project = ([x, y]: Point): Point => [(x - x0) * scale, (y - y0) * scale];
  const dot = project(lot.dot);
  const elbow = project(lot.elbow);
  const end = project(lot.end);
  const maxLeft = Math.max(16, size.w - reservedRight - CARD_W);
  const left = clamp(lot.side === "right" ? end[0] : end[0] - CARD_W, 16, maxLeft);
  const top = clamp(end[1] - CARD_H / 2, 16, Math.max(16, size.h - CARD_H - 16));
  const lineY = clamp(end[1], top + 28, top + CARD_H - 28);
  const endX = lot.side === "right" ? left : left + CARD_W;
  const elbowX = lot.side === "right" ? Math.min(elbow[0], endX - 24) : Math.max(elbow[0], endX + 24);
  return { dot, elbow: [elbowX, lineY] as Point, end: [endX, lineY] as Point, left, top };
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
    poly.forEach((currentPoint, i) => {
      const prev = poly[(i + poly.length - 1) % poly.length]!;
      if (inside(currentPoint)) {
        if (!inside(prev)) next.push(intersect(prev, currentPoint));
        next.push(currentPoint);
      } else if (inside(prev)) {
        next.push(intersect(prev, currentPoint));
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** El registro: los datos aparecen uno por uno, creciendo desde el lado de la línea. */
function RecordCard({ scene, color, animate }: { scene: Scene; color: string; animate: boolean }) {
  const reveal = (index: number) =>
    animate
      ? {
          initial: { clipPath: "inset(0 100% 0 0)", opacity: 0.4 },
          animate: { clipPath: "inset(0 0% 0 0)", opacity: 1 },
          transition: { duration: 0.45, delay: 1.2 + index * 0.08, ease: EASE },
        }
      : {};
  return (
    <>
      <motion.div {...reveal(0)} className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} aria-hidden />
          <span className="rounded-full bg-l-accent-tint px-2.5 py-1 text-xs font-semibold text-l-ink">{scene.record.type}</span>
        </span>
        <span className="text-xs text-l-ink-soft">Registro nuevo</span>
      </motion.div>
      <dl className="mt-3 grid gap-1.5 text-[13px]">
        {scene.record.lines.map(([label, value], index) => (
          <motion.div key={label} {...reveal(index + 1)} className="flex items-baseline justify-between gap-3">
            <dt className="text-l-ink-soft">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </motion.div>
        ))}
      </dl>
    </>
  );
}

const bubbleMotion = (reduceMotion: boolean) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 12, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, transition: { duration: 0.15 } },
  transition: { type: "spring" as const, stiffness: 420, damping: 30 },
});

/**
 * El chat: la conversación se va acumulando (los mensajes anteriores suben) y el
 * mensaje de la escena se carga en la caja de abajo antes de enviarse: se
 * escribe, se graba el audio o se adjunta la foto.
 */
function PhoneChat({ current, phase, typed, reduceMotion }: { current: number; phase: Phase; typed: number; reduceMotion: boolean }) {
  const scene = HERO_SCENES[current] ?? HERO_SCENES[0]!;
  const motionProps = bubbleMotion(reduceMotion);

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
            <p className="text-[10px] text-black/55">{phase === "thinking" ? "escribiendo…" : "en línea"}</p>
          </div>
          <Video className="size-[18px] text-[#007aff]" />
          <Phone className="ml-2 size-4 text-[#007aff]" />
        </div>

        <div className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden px-2.5 pt-3 pb-3">
          <Image src="/landing/bg-whatsapp.png" alt="" fill sizes="300px" className="object-cover" />
          <p className="relative mx-auto mb-auto rounded-md bg-white/90 px-2 py-0.5 text-[10px] text-black/55 shadow-sm">Hoy</p>

          <AnimatePresence mode="popLayout" initial={false}>
            {HERO_SCENES.slice(0, current + 1).flatMap((s, i) => {
              const isCurrent = i === current;
              const items = [];
              if (!isCurrent || phase !== "typing") {
                items.push(
                  <motion.div key={`${s.id}-out`} layout {...motionProps} className="relative ml-auto max-w-[86%]">
                    <OutgoingBubble scene={s} time={`10:${41 + i * 2}`} />
                  </motion.div>,
                );
              }
              if (isCurrent && phase === "thinking") {
                items.push(
                  <motion.div key={`${s.id}-thinking`} layout {...motionProps} className="relative max-w-[80%]">
                    <div className="rounded-[10px] rounded-tl-sm bg-white px-3 py-2 text-[13px] shadow-sm">
                      <ThinkingShimmer className="text-l-ink-soft">Procesando el mensaje…</ThinkingShimmer>
                    </div>
                  </motion.div>,
                );
              }
              if (!isCurrent || phase === "done") {
                items.push(
                  <motion.div key={`${s.id}-reply`} layout {...motionProps} className="relative max-w-[86%]">
                    <div className="rounded-[10px] rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-snug text-l-ink shadow-sm">
                      {s.reply}
                      <span className="mt-1 block text-right text-[10px] text-l-ink-soft">10:{42 + i * 2}</span>
                    </div>
                  </motion.div>,
                );
              }
              return items;
            })}
          </AnimatePresence>
        </div>

        <Composer scene={scene} typing={phase === "typing"} typed={typed} />
      </div>

      {/* Dynamic Island, encima de la pantalla. */}
      <div aria-hidden className="absolute rounded-full bg-black" style={{ left: "37.2%", top: "3.3%", width: "25.6%", height: "3.6%" }} />
    </div>
  );
}

/** La caja de abajo del chat: vacía, o con el mensaje que se está cargando. */
function Composer({ scene, typing, typed }: { scene: Scene; typing: boolean; typed: number }) {
  const body = !typing ? (
    <span className="flex h-7 flex-1 items-center rounded-full border border-black/10 bg-white px-3 text-[11px] text-black/35">Mensaje</span>
  ) : scene.kind === "audio" ? (
    <span className="flex h-7 flex-1 items-center gap-2 rounded-full bg-white px-3 text-[11px] text-l-ink shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">
      <span className="size-2 animate-pulse rounded-full bg-[#e5484d]" />
      <span className="tabular-nums">0:0{Math.min(9, Math.floor(typed / 5))}</span>
      <Waveform live />
    </span>
  ) : (
    <span className="flex min-h-7 flex-1 items-center gap-1.5 rounded-[14px] bg-white px-3 py-1 text-[11px] leading-snug text-l-ink shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">
      {scene.kind === "photo" ? <FileImage className="size-4 shrink-0 text-l-brand" strokeWidth={1.75} /> : null}
      <span className="line-clamp-2">
        {scene.message.slice(0, typed)}
        <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-l-ink" />
      </span>
    </span>
  );

  return (
    <div className="flex shrink-0 items-center gap-2 bg-[#f6f5f3] px-3 pt-2 pb-5">
      <Plus className="size-5 shrink-0 text-[#007aff]" />
      {body}
      {typing && scene.kind !== "audio" ? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
          <SendHorizontal className="size-3.5" />
        </span>
      ) : typing ? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
          <Mic className="size-3.5" />
        </span>
      ) : (
        <>
          <Camera className="size-[18px] shrink-0 text-[#007aff]" />
          <Mic className="size-[18px] shrink-0 text-[#007aff]" />
        </>
      )}
    </div>
  );
}

function OutgoingBubble({ scene, time }: { scene: Scene; time: string }) {
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
        {time}
        <CheckCheck className="size-3.5 text-[#53bdeb]" />
      </span>
    </div>
  );
}

/** Onda de audio: alturas fijas (no aleatorias) para que server y cliente rendericen igual. */
const WAVE = [6, 12, 8, 16, 10, 18, 7, 14, 9, 17, 11, 6, 13, 8, 15, 7, 12, 5];

function Waveform({ live = false }: { live?: boolean }) {
  return (
    <span className="flex h-5 flex-1 items-center gap-[2px]">
      {WAVE.map((height, index) => (
        <span
          key={index}
          className={cn("w-[2px] rounded-full", live ? "animate-pulse bg-[#e5484d]/70" : "bg-l-ink-soft/70")}
          style={{ height: live ? Math.max(4, height * 0.7) : height, animationDelay: live ? `${(index % 6) * 90}ms` : undefined }}
        />
      ))}
    </span>
  );
}
