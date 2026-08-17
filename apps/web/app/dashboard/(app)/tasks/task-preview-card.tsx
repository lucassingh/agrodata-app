import type { ReactNode } from "react";
import Image from "next/image";
import { Sprout, Package, FlaskConical } from "lucide-react";
import { CowHeadIcon } from "@/components/cow-head-icon";
import { TASK_TYPE_LABEL } from "./task-labels";
import type { TaskType } from "./types";

interface TaskPreviewCardProps {
  type: TaskType;
  deadlineLabel: string;
  generatedByName?: string;
  responsibleName?: string;
  treatment?: string | null;
  crop?: string | null;
  pastureNames: string[];
  animals: { quantity: number; animalType: string }[];
  products: { productName: string; dosis?: string | null }[];
  fertilizers: { source: string; dosis?: string | null }[];
  description?: string | null;
}

/** Reusado en el paso 2 del diálogo de creación y en el detalle de solo
 *  lectura -- puerto de `renderPreview()` del legacy. */
export function TaskPreviewCard({
  type,
  deadlineLabel,
  generatedByName,
  responsibleName,
  treatment,
  crop,
  pastureNames,
  animals,
  products,
  fertilizers,
  description,
}: TaskPreviewCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <Image src="/brand/logo-small.png" alt="AgroData" width={32} height={24} />
        <p className="text-xs text-muted-foreground">Fecha límite: {deadlineLabel}</p>
      </div>
      <h3 className="font-heading text-base font-semibold">{TASK_TYPE_LABEL[type]}</h3>

      {generatedByName ? <PreviewField label="Generado por" value={generatedByName} muted /> : null}
      {responsibleName ? <PreviewField label="Responsable" value={responsibleName} muted /> : null}
      {treatment ? <PreviewField label="Tratamiento" value={treatment} /> : null}
      {crop ? <PreviewField label="Cultivo" value={crop} /> : null}

      {pastureNames.length ? (
        <PreviewChips
          label="Potreros"
          items={pastureNames}
          bg="#E8F5EE"
          color="#2D6A4F"
          icon={<Sprout size={11} />}
        />
      ) : null}
      {animals.length ? (
        <PreviewChips
          label="Animales"
          items={animals.map((a) => `${a.quantity} ${a.animalType}`)}
          bg="#FDF4E3"
          color="#7C6445"
          icon={<CowHeadIcon size={11} />}
        />
      ) : null}
      {products.length ? (
        <PreviewChips
          label="Productos"
          items={products.map((p) => (p.dosis ? `${p.productName} · ${p.dosis}` : p.productName))}
          bg="#EFF6FF"
          color="#3B82F6"
          icon={<Package size={11} />}
        />
      ) : null}
      {fertilizers.length ? (
        <PreviewChips
          label="Fertilizantes"
          items={fertilizers.map((f) => (f.dosis ? `${f.source} · ${f.dosis}` : f.source))}
          bg="#E6F9F1"
          color="#10B981"
          icon={<FlaskConical size={11} />}
        />
      ) : null}
      {description ? <PreviewField label="Descripción" value={description} /> : null}
    </div>
  );
}

function PreviewField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={muted ? "rounded-lg bg-muted/50 px-3 py-2" : undefined}>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function PreviewChips({
  label,
  items,
  bg,
  color,
  icon,
}: {
  label: string;
  items: string[];
  bg: string;
  color: string;
  icon: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: bg, color }}
          >
            {icon}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
