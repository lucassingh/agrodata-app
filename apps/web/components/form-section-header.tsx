"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const bigint = parseInt(expanded, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface FormSectionHeaderProps {
  icon: ReactNode;
  title: string;
  color?: string;
  count?: number;
  maxCount?: number;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}

/** Puerto directo de frontend/src/components/shared/FormSectionHeader.tsx — usado en
 *  las sub-secciones repetibles de Potreros/Tareas (cultivos, animales, productos...). */
export function FormSectionHeader({
  icon,
  title,
  color = "#2D6A4F",
  count,
  maxCount,
  actionLabel = "Agregar",
  actionDisabled,
  onAction,
}: FormSectionHeaderProps) {
  return (
    <div
      className="flex items-center justify-between rounded-md px-3 py-2"
      style={{
        backgroundColor: hexToRgba(color, 0.06),
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: hexToRgba(color, 0.12), color }}
        >
          {icon}
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {title}
        </span>
        {count !== undefined ? (
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: hexToRgba(color, 0.1),
              color: hexToRgba(color, 0.7),
            }}
          >
            {maxCount !== undefined ? `${count} / ${maxCount}` : count}
          </span>
        ) : null}
      </div>
      {onAction ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={actionDisabled}
          onClick={onAction}
          style={{ color }}
          className="hover:bg-transparent"
        >
          <Plus size={14} />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
