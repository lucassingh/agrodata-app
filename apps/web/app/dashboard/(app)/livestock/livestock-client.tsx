"use client";

import { useState } from "react";
import { Eye, FileSpreadsheet, Plus, Scale } from "lucide-react";
import type { LivestockGroup } from "@repo/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { GroupDialog } from "./group-dialog";
import { ImportWeighingsDialog, WeighingDialog } from "./weighing-dialogs";

const number = (value: number | null, digits = 0) =>
  value === null ? "—" : new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits }).format(value);
const dayMonthYear = (day: string | null) => (day ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(2, 4)}` : "—");

interface LivestockClientProps {
  groups: LivestockGroup[] | null;
  pastures: { id: string; name: string }[];
  categories: string[];
  canEdit: boolean;
}

function Kpi({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl font-bold">{value}</p>
        {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}

export function LivestockClient({ groups, pastures, categories, canEdit }: LivestockClientProps) {
  const [dialog, setDialog] = useState<"weighing" | "import" | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  if (!groups) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <Scale className="text-muted-foreground" />
        <p className="font-medium text-foreground">Sin establecimiento activo</p>
        <p className="max-w-sm text-sm text-muted-foreground">Elegí o creá un campo desde el menú de usuario.</p>
      </div>
    );
  }

  const heads = groups.reduce((sum, g) => sum + (g.currentHeads ?? 0), 0);
  const weighed = groups.filter((g) => g.performance.lastAverageKg !== null);
  const withGain = groups.filter((g) => g.performance.adpv !== null && g.performance.headCount);
  const gainHeads = withGain.reduce((sum, g) => sum + g.performance.headCount!, 0);
  const avgGain = gainHeads > 0 ? withGain.reduce((sum, g) => sum + g.performance.adpv! * g.performance.headCount!, 0) / gainHeads : null;
  const detail = groups.find((g) => g.key === detailKey) ?? null;

  const columns: DataTableColumn<LivestockGroup>[] = [
    {
      key: "group",
      label: "Grupo",
      render: (g) => (
        <div>
          <p className="font-medium whitespace-nowrap">{g.animalType}</p>
          <p className="text-xs text-muted-foreground">{g.pastureName}</p>
        </div>
      ),
    },
    { key: "heads", label: "Cabezas", className: "text-right", render: (g) => number(g.currentHeads) },
    {
      key: "weight",
      label: "Último peso",
      className: "text-right whitespace-nowrap",
      render: (g) => (
        <div>
          <p>{g.performance.lastAverageKg !== null ? `${number(g.performance.lastAverageKg, 1)} kg` : "—"}</p>
          <p className="text-xs text-muted-foreground">{dayMonthYear(g.performance.lastDay)}</p>
        </div>
      ),
    },
    {
      key: "adpv",
      label: "ADPV",
      className: "text-right whitespace-nowrap",
      render: (g) =>
        g.performance.adpv === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={`font-semibold ${g.performance.adpv >= 0 ? "text-[#2D6A4F]" : "text-destructive"}`}>
            {number(g.performance.adpv, 3)} kg/día
          </span>
        ),
    },
    {
      key: "produced",
      label: "Kg producidos/ha",
      className: "text-right whitespace-nowrap",
      render: (g) => (
        <div>
          <p>{number(g.performance.kgProducedPerHa, 1)}</p>
          {g.performance.periodDays ? <p className="text-xs text-muted-foreground">en {g.performance.periodDays} días</p> : null}
        </div>
      ),
    },
    {
      key: "load",
      label: "Carga",
      className: "text-right whitespace-nowrap",
      render: (g) => (
        <div>
          <p>{g.performance.liveKgPerHa !== null ? `${number(g.performance.liveKgPerHa)} kg/ha` : "—"}</p>
          <p className="text-xs text-muted-foreground">{g.performance.headsPerHa !== null ? `${number(g.performance.headsPerHa, 2)} cab/ha` : ""}</p>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (g) => (
        <Button variant="ghost" size="icon-sm" title="Ver pesadas" aria-label={`Ver pesadas de ${g.animalType} en ${g.pastureName}`} onClick={() => setDetailKey(g.key)}>
          <Eye size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        {canEdit ? (
          <>
            <Button variant="outline" onClick={() => setDialog("import")} disabled={pastures.length === 0}>
              <FileSpreadsheet size={14} />
              Importar planilla
            </Button>
            <Button onClick={() => setDialog("weighing")} disabled={pastures.length === 0} title={pastures.length === 0 ? "Cargá un potrero primero" : undefined}>
              <Plus size={14} />
              Cargar pesada
            </Button>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cabezas" value={number(heads)} caption={`${groups.length} ${groups.length === 1 ? "grupo" : "grupos"}`} />
        <Kpi label="Grupos pesados" value={number(weighed.length)} />
        <Kpi label="ADPV promedio" value={avgGain !== null ? `${number(avgGain, 3)} kg/día` : "—"} caption={avgGain !== null ? "Ponderado por cabezas" : "Hacen falta dos pesadas de un grupo"} />
        <Kpi label="Pesadas cargadas" value={number(groups.reduce((sum, g) => sum + g.weighings.length, 0))} />
      </div>

      {groups.length === 0 ? (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <Scale className="text-muted-foreground" />
          <p className="font-heading text-lg font-semibold">Todavía no hay hacienda ni pesadas</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Cargá los animales en Potreros o mandá una pesada por WhatsApp: «pesé 40 terneros del corral 1, promedio 180 kg».
            También podés importar una planilla con los pesos.
          </p>
        </div>
      ) : (
        <DataTable rows={groups} columns={columns} />
      )}

      {detail ? <GroupDialog group={detail} canEdit={canEdit} onClose={() => setDetailKey(null)} /> : null}
      {dialog === "weighing" ? <WeighingDialog pastures={pastures} categories={categories} onClose={() => setDialog(null)} /> : null}
      {dialog === "import" ? <ImportWeighingsDialog onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
