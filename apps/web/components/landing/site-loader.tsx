"use client";

import { motion } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const ReadyContext = createContext(true);

/** true cuando el loader ya se está yendo: las animaciones de entrada esperan esto para no correr tapadas. */
export function useSiteReady() {
  return useContext(ReadyContext);
}

/** Los tres lotes del isotipo (components/brand/campia-logo.tsx, viewBox 48x48). */
const LOTS = [
  { d: "M8.5 9.5 L20.5 8.5 L19.5 40 L8.5 40 Z", from: "translate(-4px, 2px)" },
  { d: "M23 8.5 L40 9.8 L40 22.8 L22.6 23.6 Z", from: "translate(3px, -4px)" },
  {
    d: "M23 25.8 L40 25 L39.4 40 L22 40 Z M34.2 33 a3.2 3.2 0 1 0 -6.4 0 a3.2 3.2 0 1 0 6.4 0 Z",
    from: "translate(4px, 4px)",
  },
];
/** El nodo de IA calado en el tercer lote: de ahí se abre la pantalla. */
const NODE = { cx: 31, cy: 33, r: 3.2 };

/** Mínimo de la ola de los lotes, contado desde que empezó a cargar la página (ms). */
const CHASE_MS = 1300;
/** Después de hidratar, la ola se ve al menos esto, aunque la página haya tardado. */
const MIN_AFTER_HYDRATION_MS = 450;
/** Si la página no terminó de cargar a esta altura, se sigue igual. */
const LOAD_CAP_MS = 3200;
const EXPAND_MS = 1000;
const REVEAL_MS = 550;

const CREAM = "#fff5e1";
/** --l-bg de la landing: la pantalla se abre del mismo color que el hero, así el corte no se nota. */
const LANDING_BG = "oklch(0.986 0.004 160)";

type Phase = "chase" | "expand" | "reveal" | "done";

/** Se muestra una vez por carga: si se vuelve a la landing navegando, ya no. */
let playedThisLoad = false;

/**
 * Loader de entrada de la landing. Fondo verde con el isotipo en crema: los lotes
 * se encastran y se encienden en ola mientras carga; después el nodo de IA se
 * enciende y se abre hasta cubrir la pantalla con el fondo de la landing, que se
 * funde y deja ver el hero. Las animaciones de la ola son CSS (globals.css), así
 * corren antes de hidratar. Sin JS o con movimiento reducido no aparece.
 */
export function SiteLoader({ children }: { children: ReactNode }) {
  const reduceMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(() => (playedThisLoad ? "done" : "chase"));
  const [percent, setPercent] = useState<number | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number; from: number; to: number } | null>(null);
  const markRef = useRef<SVGSVGElement>(null);

  // Ola: dura lo que tarde la página en cargar, entre un mínimo y un tope.
  useEffect(() => {
    if (phase !== "chase") return;
    if (reduceMotion) {
      setPhase("done");
      return;
    }
    const chaseEnd = Math.max(CHASE_MS, performance.now() + MIN_AFTER_HYDRATION_MS);
    let loaded = document.readyState === "complete";
    const onLoad = () => (loaded = true);
    window.addEventListener("load", onLoad);

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const done = now >= chaseEnd && (loaded || now >= LOAD_CAP_MS);
      setPercent(done ? 100 : Math.min(99, Math.round((now / chaseEnd) * 100)));
      if (done) {
        setOrigin(nodeOrigin(markRef.current));
        setPhase("expand");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
    };
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (phase === "expand") {
      const timer = setTimeout(() => setPhase("reveal"), EXPAND_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "reveal") {
      const timer = setTimeout(() => setPhase("done"), REVEAL_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "done") playedThisLoad = true;
  }, [phase]);

  const ready = phase === "reveal" || phase === "done";
  const chasing = phase === "chase";

  return (
    <ReadyContext.Provider value={ready}>
      {phase !== "done" ? (
        <motion.div
          aria-hidden
          className="campia-loader fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[#1b4332]"
          initial={false}
          animate={{ opacity: phase === "reveal" ? 0 : 1 }}
          transition={{ duration: REVEAL_MS / 1000, ease: [0.25, 1, 0.5, 1] }}
          style={{ pointerEvents: phase === "reveal" ? "none" : "auto" }}
        >
          {/* Sin JS no hay quién lo saque. */}
          <noscript>
            <style>{".campia-loader{display:none}"}</style>
          </noscript>

          {/* Solo el isologo, con «Cargando» al lado y centrado en vertical con él. */}
          <div className="flex items-center gap-[clamp(14px,2vw,20px)]" style={{ color: CREAM }}>
            <div className="relative aspect-square w-[clamp(64px,8vw,84px)] shrink-0">
              <svg ref={markRef} viewBox="0 0 48 48" className="block size-full overflow-visible" fill={CREAM}>
                {LOTS.map((lot, index) => (
                  <path
                    key={index}
                    d={lot.d}
                    fillRule="evenodd"
                    className={cn("campia-loader-lot", !chasing && "campia-loader-lot-still")}
                    style={{ "--lot-from": lot.from, "--lot-index": index } as CSSProperties}
                  />
                ))}
              </svg>
              {/* Pulso del nodo de IA mientras carga. */}
              <span
                className={cn("campia-loader-ping absolute rounded-full border-[1.5px]", !chasing && "opacity-0")}
                style={{
                  left: `${(NODE.cx / 48) * 100}%`,
                  top: `${(NODE.cy / 48) * 100}%`,
                  width: `${((NODE.r * 2) / 48) * 100}%`,
                  height: `${((NODE.r * 2) / 48) * 100}%`,
                  borderColor: CREAM,
                }}
              />
            </div>

            <span
              className={cn(
                "campia-loader-label flex items-baseline gap-2 font-sans text-[14px] tracking-[0.04em] transition-opacity duration-200",
                !chasing && "opacity-0",
              )}
            >
              Cargando
              {/* Ancho fijo: que el número no empuje al isologo cuando cambia de cifras. */}
              <span className="min-w-[4ch] tabular-nums opacity-70">{percent === null ? "" : `${percent}%`}</span>
            </span>
          </div>

          {/* El nodo se enciende y se abre hasta tapar todo con el fondo de la landing. */}
          {origin ? (
            <motion.div
              className="absolute inset-0"
              style={{ backgroundColor: LANDING_BG }}
              initial={{ clipPath: `circle(${origin.from}px at ${origin.x}px ${origin.y}px)` }}
              animate={{ clipPath: `circle(${origin.to}px at ${origin.x}px ${origin.y}px)` }}
              transition={{ duration: EXPAND_MS / 1000, ease: [0.76, 0, 0.24, 1], delay: 0.12 }}
            />
          ) : null}
        </motion.div>
      ) : null}
      {children}
    </ReadyContext.Provider>
  );
}

/** Centro y radio del nodo en pantalla, y el radio que cubre toda la ventana desde ahí. */
function nodeOrigin(mark: SVGSVGElement | null) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (!mark) return { x: width / 2, y: height / 2, from: 0, to: Math.hypot(width, height) };
  const rect = mark.getBoundingClientRect();
  const x = rect.left + (rect.width * NODE.cx) / 48;
  const y = rect.top + (rect.height * NODE.cy) / 48;
  const to = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 4;
  return { x, y, from: (rect.width * NODE.r) / 48, to };
}
