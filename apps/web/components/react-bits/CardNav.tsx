"use client";

// Adaptado de React Bits (reactbits.dev/components/card-nav).
// Cambios: íconos de lucide (sin react-icons), hamburguesa como <button> real,
// logo y CTA como slots, cierre con Escape y al elegir un link, textos en
// español y animación instantánea con prefers-reduced-motion.

import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type CardNavLink = { label: string; href: string };

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
};

export interface CardNavProps {
  logo: ReactNode;
  cta: ReactNode;
  items: CardNavItem[];
  className?: string;
  ease?: string;
}

const BAR_HEIGHT = 64;

export default function CardNav({ logo, cta, items, className, ease = "power3.out" }: CardNavProps) {
  const [open, setOpen] = useState(false);
  // Sigue en true hasta que termina la animación de cierre, para que las tarjetas no desaparezcan antes.
  const [expanded, setExpanded] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  const expandedHeight = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl) return 280;
    if (!window.matchMedia("(max-width: 768px)").matches) return 280;
    const content = navEl.querySelector<HTMLElement>(".card-nav-content");
    if (!content) return 280;
    const previous = { visibility: content.style.visibility, position: content.style.position, height: content.style.height };
    Object.assign(content.style, { visibility: "visible", position: "static", height: "auto" });
    const height = BAR_HEIGHT + content.scrollHeight + 16;
    Object.assign(content.style, previous);
    return height;
  }, []);

  const createTimeline = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl) return null;
    const duration = reduceMotion ? 0 : 0.4;
    gsap.set(navEl, { height: BAR_HEIGHT, overflow: "hidden" });
    gsap.set(cardsRef.current, { y: reduceMotion ? 0 : 50, opacity: 0 });
    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, { height: expandedHeight, duration, ease });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration, ease, stagger: reduceMotion ? 0 : 0.08 }, reduceMotion ? 0 : "-=0.1");
    return tl;
  }, [ease, expandedHeight, reduceMotion]);

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;
    return () => {
      tl?.kill();
      tlRef.current = null;
    };
  }, [createTimeline, items]);

  useEffect(() => {
    const onResize = () => {
      tlRef.current?.kill();
      const tl = createTimeline();
      if (tl && open) tl.progress(1);
      tlRef.current = tl;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [createTimeline, open]);

  const setMenu = useCallback((next: boolean) => {
    const tl = tlRef.current;
    if (!tl) return;
    setOpen(next);
    if (next) {
      setExpanded(true);
      tl.eventCallback("onReverseComplete", null);
      tl.play(0);
    } else {
      tl.eventCallback("onReverseComplete", () => setExpanded(false));
      tl.reverse();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setMenu]);

  return (
    <div className={cn("card-nav-container fixed top-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[880px] -translate-x-1/2 md:top-5", className)}>
      <nav
        ref={navRef}
        aria-label="Principal"
        className="card-nav relative block h-16 overflow-hidden rounded-[16px] bg-white/95 p-0 shadow-l-lg backdrop-blur-md will-change-[height]"
      >
        <div className="card-nav-top absolute inset-x-0 top-0 z-[2] flex h-16 items-center justify-between p-2 pl-3">
          <button
            type="button"
            onClick={() => setMenu(!open)}
            aria-expanded={open}
            aria-controls="card-nav-content"
            className="group order-2 flex size-12 flex-col items-center justify-center gap-[6px] rounded-full text-l-ink outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60 md:order-none"
          >
            <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
            <span
              aria-hidden
              className={cn(
                "h-[2px] w-[26px] bg-current transition-transform duration-300 ease-out group-hover:opacity-75",
                open && "translate-y-[4px] rotate-45",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "h-[2px] w-[26px] bg-current transition-transform duration-300 ease-out group-hover:opacity-75",
                open && "-translate-y-[4px] -rotate-45",
              )}
            />
          </button>

          <div className="order-1 flex items-center md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:order-none">
            {logo}
          </div>

          <div className="hidden h-full items-center md:flex">{cta}</div>
        </div>

        <div
          id="card-nav-content"
          className={cn(
            "card-nav-content absolute inset-x-0 top-16 bottom-0 z-[1] flex flex-col items-stretch justify-start gap-2 p-2 md:flex-row md:items-end md:gap-3",
            expanded ? "visible" : "invisible",
            open ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-hidden={!open}
        >
          {items.slice(0, 3).map((item, index) => (
            <div
              key={item.label}
              ref={(el) => {
                if (el) cardsRef.current[index] = el;
              }}
              className="nav-card relative flex h-auto min-h-[60px] min-w-0 flex-[1_1_auto] flex-col gap-2 rounded-[12px] p-4 select-none md:h-full md:min-h-0 md:flex-[1_1_0%]"
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <p className="font-heading text-lg font-semibold tracking-[-0.01em] md:text-[22px]">{item.label}</p>
              <ul className="mt-auto flex flex-col gap-1">
                {item.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      tabIndex={open ? 0 : -1}
                      onClick={() => setMenu(false)}
                      className="inline-flex items-center gap-1.5 rounded-sm text-[15px] transition-opacity duration-200 outline-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-current md:text-base"
                    >
                      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
