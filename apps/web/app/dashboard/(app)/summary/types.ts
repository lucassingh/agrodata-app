export interface RecordByType {
  type: string;
  count: number;
}

export interface AnimalByType {
  type: string;
  count: number;
}

export interface CropSummaryItem {
  name: string;
  count: number;
}

export interface ExpenseByCategory {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  count: number;
}

export interface SupplyAlert {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: { name: string } | null;
}

export interface RecentRecord {
  id: string;
  type: string;
  occurredAt: Date;
  data: unknown;
  source: string;
  userId: string | null;
}

export interface DashboardSummaryData {
  kpis: {
    animales: number;
    lluvia: number;
    mortandad: number;
    ventas: number;
    compras: number;
    datosIngresados: number;
  };
  totalPastures: number;
  totalTasks: number;
  pendingTasks: number;
  totalExpenses: number;
  totalSupplies: number;
  totalUsers: number;
  recordsByType: RecordByType[];
  recentRecords: RecentRecord[];
  totalHectares: number;
  totalAnimals: number;
  animalsByType: AnimalByType[];
  cropSummary: CropSummaryItem[];
  expensesByCategory: ExpenseByCategory[];
  supplyAlerts: SupplyAlert[];
}

export const ZERO_DASHBOARD: DashboardSummaryData = {
  kpis: { animales: 0, lluvia: 0, mortandad: 0, ventas: 0, compras: 0, datosIngresados: 0 },
  totalPastures: 0,
  totalTasks: 0,
  pendingTasks: 0,
  totalExpenses: 0,
  totalSupplies: 0,
  totalUsers: 0,
  recordsByType: [],
  recentRecords: [],
  totalHectares: 0,
  totalAnimals: 0,
  animalsByType: [],
  cropSummary: [],
  expensesByCategory: [],
  supplyAlerts: [],
};
