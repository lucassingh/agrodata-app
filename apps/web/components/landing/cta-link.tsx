"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const MotionLink = motion.create(Link);

const VARIANTS = {
  primary: "bg-l-brand text-white hover:bg-l-brand-dark",
  secondary: "border border-l-line bg-white text-l-ink hover:border-l-ink/30",
  onBrand: "bg-white text-l-brand-dark hover:bg-l-brand-tint",
} as const;

const SIZES = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
} as const;

type CtaLinkProps = {
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  onClick?: () => void;
};

/**
 * Botón-link de la landing. Regla de forma: los controles interactivos son
 * píldora (rounded-full); tarjetas y paneles 16px; inputs 10px.
 */
export function CtaLink({ href, children, variant = "primary", size = "md", className, onClick }: CtaLinkProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <MotionLink
      href={href}
      onClick={onClick}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.6 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-l-brand-light/60 focus-visible:ring-offset-2",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </MotionLink>
  );
}
