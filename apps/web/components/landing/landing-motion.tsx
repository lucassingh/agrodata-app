"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Con prefers-reduced-motion, Motion desactiva transforms y layout en toda la landing. */
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
