"use client";

import BlurText from "@/components/react-bits/BlurText";
import { useSiteReady } from "./site-loader";

/** El título del hero entra cuando el loader se está yendo, no tapado por él. */
export function HeroTitle({ text }: { text: string }) {
  const ready = useSiteReady();
  return (
    <BlurText
      as="h1"
      text={text}
      delay={70}
      animateBy="words"
      direction="bottom"
      stepDuration={0.3}
      paused={!ready}
      className="font-heading text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.04] font-bold tracking-[-0.035em] text-l-ink"
    />
  );
}
