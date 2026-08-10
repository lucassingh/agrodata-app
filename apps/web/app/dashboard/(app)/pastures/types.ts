export interface PastureCrop {
  id: string;
  crop: string;
  hectares: number | null;
  startDate: Date | null;
}

export interface PastureAnimal {
  id: string;
  quantity: number;
  animalType: string;
  averageWeight: number | null;
}

export interface Pasture {
  id: string;
  name: string;
  hectares: number | null;
  crops: PastureCrop[];
  animals: PastureAnimal[];
}
