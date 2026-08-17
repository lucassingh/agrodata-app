import {
  Sprout,
  Bug,
  MoveRight,
  ShoppingCart,
  SprayCan,
  Droplets,
  ShieldPlus,
  Package,
  FlaskConical,
  Upload,
  type LucideIcon,
} from "lucide-react";

export interface RecordTypeConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
}

/** Solo los 9 valores reales del enum `RecordType` -- el legacy también mapeaba
 *  strings de una era pre-enum (LLUVIA, MOVIMIENTO, SANIDAD...) que no existen acá. */
const RECORD_TYPE_MAP: Record<string, RecordTypeConfig> = {
  SEEDING: { icon: Sprout, color: "#2D6A4F", bg: "#E8F5EE", label: "Siembra" },
  ANIMAL_BIRTH: { icon: Bug, color: "#7C6445", bg: "#F3EDE5", label: "Nacimiento" },
  POTRERO_CHANGE: { icon: MoveRight, color: "#D4930D", bg: "#FDF4E3", label: "Cambio potrero" },
  PURCHASE: { icon: ShoppingCart, color: "#3B7DC4", bg: "#E8F0FA", label: "Compra" },
  SALE: { icon: ShoppingCart, color: "#2D9F5C", bg: "#E8F5EE", label: "Venta" },
  FUMIGATION: { icon: SprayCan, color: "#7C3AED", bg: "#F3EEFE", label: "Pulverización" },
  FUEL_USAGE: { icon: Droplets, color: "#D4930D", bg: "#FDF4E3", label: "Combustible" },
  EXPENSE_INVOICE: { icon: ShoppingCart, color: "#C4453A", bg: "#FDECEB", label: "Gasto" },
  TASK_COMPLETED: { icon: ShieldPlus, color: "#10B981", bg: "#E6F9F1", label: "Tarea completada" },
};

const DEFAULT_TYPE_CONFIG: RecordTypeConfig = {
  icon: Upload,
  color: "#5F6368",
  bg: "#F0F0F0",
  label: "Registro",
};

/** Override por `data.taskType` -- usado por los Records que crea el botón
 *  "Agregar Dato" de Tareas (ver TASK_TO_RECORD_TYPE en el módulo de tareas). */
const TASK_TYPE_RECORD_CONFIG: Record<string, RecordTypeConfig> = {
  TRATAMIENTO_SANITARIO: { icon: ShieldPlus, color: "#D97706", bg: "#FDF4E3", label: "Sanidad" },
  ORDEN_SIEMBRA: { icon: Sprout, color: "#2D6A4F", bg: "#E8F5EE", label: "Siembra" },
  PULVERIZACION: { icon: SprayCan, color: "#7C3AED", bg: "#F3EEFE", label: "Pulverización" },
  FERTILIZACION: { icon: FlaskConical, color: "#10B981", bg: "#E6F9F1", label: "Fertilización" },
};

const SUPPLY_RECORD_CONFIG: RecordTypeConfig = {
  icon: Package,
  color: "#0F766E",
  bg: "#CCFBF1",
  label: "Insumo",
};

/** Puerto directo de `getRecordConfig` del legacy: el `type` fuerte del enum
 *  queda mayormente cosmético -- `data.taskType`/`data.supplyId` mandan primero. */
export function getRecordConfig(type: string, data: unknown): RecordTypeConfig {
  const d = (data ?? {}) as Record<string, unknown>;
  const taskType = typeof d.taskType === "string" ? d.taskType.toUpperCase() : undefined;
  if (taskType && TASK_TYPE_RECORD_CONFIG[taskType]) {
    return TASK_TYPE_RECORD_CONFIG[taskType];
  }
  if (d.supplyId) {
    return SUPPLY_RECORD_CONFIG;
  }
  return RECORD_TYPE_MAP[type.toUpperCase()] ?? { ...DEFAULT_TYPE_CONFIG, label: type };
}
