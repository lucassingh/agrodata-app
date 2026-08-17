import { ShieldPlus, Sprout, SprayCan, FlaskConical, type LucideIcon } from "lucide-react";
import type { TaskType } from "./types";

export const TASK_TYPE_ORDER: TaskType[] = [
  "TRATAMIENTO_SANITARIO",
  "ORDEN_SIEMBRA",
  "PULVERIZACION",
  "FERTILIZACION",
];

export const TASK_TYPE_CONFIG: Record<TaskType, { icon: LucideIcon; color: string; bg: string }> = {
  TRATAMIENTO_SANITARIO: { icon: ShieldPlus, color: "#D97706", bg: "#FDF4E3" },
  ORDEN_SIEMBRA: { icon: Sprout, color: "#2D6A4F", bg: "#E8F5EE" },
  PULVERIZACION: { icon: SprayCan, color: "#7C3AED", bg: "#F3EEFE" },
  FERTILIZACION: { icon: FlaskConical, color: "#10B981", bg: "#E6F9F1" },
};
