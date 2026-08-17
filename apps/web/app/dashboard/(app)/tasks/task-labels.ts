import type { TaskType } from "./types";

/** Sin "use client"/"use server" a propósito -- este módulo es plano (sin JSX, sin
 *  APIs de browser) y lo importan tanto Server Actions como Client Components. */
export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  TRATAMIENTO_SANITARIO: "Tratamiento sanitario",
  ORDEN_SIEMBRA: "Orden de siembra",
  PULVERIZACION: "Pulverización",
  FERTILIZACION: "Fertilización",
};

/** Puerto directo del legacy: 3 de los 4 tipos colapsan al mismo RecordType
 *  (FUMIGATION) al usar "Agregar Dato" -- no es un bug, es el mapeo real. */
export const TASK_TO_RECORD_TYPE: Record<TaskType, "FUMIGATION" | "SEEDING"> = {
  TRATAMIENTO_SANITARIO: "FUMIGATION",
  ORDEN_SIEMBRA: "SEEDING",
  PULVERIZACION: "FUMIGATION",
  FERTILIZACION: "FUMIGATION",
};

export function taskSummary(task: {
  type: TaskType;
  treatment?: string | null;
  crop?: string | null;
}): string {
  if (task.treatment) return `${TASK_TYPE_LABEL[task.type]}: ${task.treatment}`;
  if (task.crop) return `${TASK_TYPE_LABEL[task.type]}: ${task.crop}`;
  return TASK_TYPE_LABEL[task.type];
}

export function titleCase(text: string): string {
  return text
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}
