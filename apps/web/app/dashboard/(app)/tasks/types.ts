export type TaskType = "TRATAMIENTO_SANITARIO" | "ORDEN_SIEMBRA" | "PULVERIZACION" | "FERTILIZACION";
export type TaskStatus = "PENDING" | "COMPLETED";

export interface TaskProduct {
  id: string;
  productName: string;
  dosis: string | null;
  unit: string | null;
}

export interface TaskPastureRef {
  id: string;
  pastureId: string;
  hectares: string | null;
  pasture: { id: string; name: string };
}

export interface TaskAnimal {
  id: string;
  quantity: number;
  animalType: string;
}

export interface TaskFertilizer {
  id: string;
  source: string;
  dosis: string | null;
  unit: string | null;
}

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  deadline: Date;
  treatment: string | null;
  crop: string | null;
  genetic: string | null;
  spacing: string | null;
  density: string | null;
  densityUnit: string | null;
  contractor: string | null;
  description: string | null;
  responsibleId: string | null;
  responsible: { id: string; name: string; lastname: string } | null;
  products: TaskProduct[];
  pastures: TaskPastureRef[];
  animals: TaskAnimal[];
  fertilizers: TaskFertilizer[];
}
