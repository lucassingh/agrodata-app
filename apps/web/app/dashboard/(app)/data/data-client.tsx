"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Database, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TablePagination } from "@/components/table-pagination";
import type { RecordRow } from "./types";
import { formatRecordSource, formatRecordDescription, usuarioLabel } from "./record-format";
import { getRecordConfig } from "./record-constants";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

interface DataClientProps {
  records: RecordRow[];
  teamMembers: { userId: string; fullName: string }[];
  hasActiveTenant: boolean;
  currentUserId: string;
  currentUserName: string;
}

/** `timeZone` fijo a propósito: sin un huso horario explícito, este SSR-eado
 *  `.toLocaleString()` calcula la hora en el huso horario ambiente de cada
 *  entorno (servidor Node vs. navegador del cliente), que casi nunca coincide
 *  -> hydration mismatch de React. Todos los tenants actuales usan este huso
 *  (default real de `Tenant.timezone`); si más adelante hace falta uno por
 *  tenant, pasarlo como prop desde el Server Component. También se normaliza
 *  el espacio en blanco resultante: el ICU de Node y el de Chromium a veces
 *  difieren en qué carácter de espacio usan antes de "a. m."/"p. m." incluso
 *  con el mismo huso horario, lo que por sí solo también dispara un hydration
 *  mismatch -- `\s+` cubre esas variantes (NBSP, espacio angosto, etc). */
function formatOccurredAt(date: Date): string {
  const formatted = date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  return formatted.replace(/\s+/g, " ");
}

export function DataClient({
  records,
  teamMembers,
  hasActiveTenant,
  currentUserId,
  currentUserName,
}: DataClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const scoped = useMemo(
    () => (activeTab === "mine" ? records.filter((r) => r.userId === currentUserId) : records),
    [records, activeTab, currentUserId],
  );
  const paged = scoped.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleTabChange = (value: "all" | "mine") => {
    setActiveTab(value);
    setPage(0);
  };

  /** Puerto exacto del legacy: los 3 botones de acción son stubs -- el backend
   *  no tiene ningún endpoint PATCH/DELETE para Record, así que no hay nada
   *  real que llamar. Se replica el mismo toast informativo, sin diálogo ni
   *  confirmación de ningún tipo. */
  const handleStubAction = (action: "Ver" | "Editar" | "Borrar", id: string) => {
    toast.info(`${action}: ${id}`);
  };

  const columns: DataTableColumn<RecordRow>[] = [
    {
      key: "occurredAt",
      label: "Fecha",
      render: (r) => (
        <span className="text-sm whitespace-nowrap text-muted-foreground">{formatOccurredAt(r.occurredAt)}</span>
      ),
    },
    {
      key: "entrada",
      label: "Entrada",
      render: (r) => {
        const config = getRecordConfig(r.type, r.data);
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: config.bg, color: config.color }}
            >
              <Icon size={15} />
            </span>
            <div>
              <p className="font-medium whitespace-nowrap">{formatRecordDescription(r)}</p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "source",
      label: "Origen",
      render: (r) => formatRecordSource(r.source),
    },
    {
      key: "userId",
      label: "Usuario",
      render: (r) => usuarioLabel(r, currentUserId, currentUserName, teamMembers),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" title="Ver registro" onClick={() => handleStubAction("Ver", r.id)}>
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Editar registro" onClick={() => handleStubAction("Editar", r.id)}>
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Borrar registro"
            onClick={() => handleStubAction("Borrar", r.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (!hasActiveTenant) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <Database className="text-muted-foreground" />
        <p className="font-medium text-foreground">Sin establecimiento activo</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Elegí o creá un campo desde el menú de usuario. Los registros (lluvias, movimientos, tareas, etc.) se
          listan solo para un establecimiento concreto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v: string | null) => v && handleTabChange(v as "all" | "mine")}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="mine">Mis datos</TabsTrigger>
        </TabsList>
      </Tabs>

      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Todavía no hay registros cargados.
        </div>
      ) : scoped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No hay registros para mostrar acá.
        </div>
      ) : (
        <div className="space-y-1">
          <DataTable rows={paged} columns={columns} />
          <TablePagination
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            count={scoped.length}
            onPageChange={setPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setPage(0);
            }}
          />
        </div>
      )}
    </div>
  );
}
