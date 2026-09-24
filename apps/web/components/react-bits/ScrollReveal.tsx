"use client";

// Adaptado de React Bits (reactbits.dev/text-animations/scroll-reveal).
// Cambios respecto del original:
// - la limpieza revierte solo los triggers propios (gsap.context) en vez de
//   ScrollTrigger.getAll().kill(), que rompía cualquier otro ScrollTrigger de la página;
// - el heading ya no envuelve un <p> (HTML inválido) y el tag es configurable;
// - con prefers-reduced-motion el texto se muestra estático y legible.

import React, { useEffect, useMemo, useRef, type ElementType, type ReactNode, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  as?: ElementType;
  scrollContainerRef?: RefObject<HTMLElement>;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  className?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  as: Tag = "h2",
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  className = "",
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="word inline-block" key={index}>
          {word}
        </span>
      );
    });
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || reduceMotion) return;

    const scroller = scrollContainerRef?.current ?? window;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { transformOrigin: "0% 50%", rotate: baseRotation },
        {
          ease: "none",
          rotate: 0,
          scrollTrigger: { trigger: el, scroller, start: "top bottom", end: rotationEnd, scrub: true },
        },
      );

      const wordElements = el.querySelectorAll<HTMLElement>(".word");

      gsap.fromTo(
        wordElements,
        { opacity: baseOpacity, willChange: "opacity" },
        {
          ease: "none",
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: "top bottom-=20%",
            end: wordAnimationEnd,
            scrub: true,
          },
        },
      );

      if (enableBlur) {
        gsap.fromTo(
          wordElements,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            stagger: 0.05,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: "top bottom-=20%",
              end: wordAnimationEnd,
              scrub: true,
            },
          },
        );
      }
    }, el);

    return () => ctx.revert();
  }, [reduceMotion, scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

  return (
    <Tag ref={containerRef} className={className}>
      {splitText}
    </Tag>
  );
};

export default ScrollReveal;
