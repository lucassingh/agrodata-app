"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Database, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TablePagination } from "@/components/table-pagination";
import type { RecordRow } from "./types";
import { formatRecordSource, formatRecordDescription, usuarioLabel } from "./record-format";
import { getRecordConfig } from "./record-constants";
import { RecordDetailDialog } from "./record-detail-dialog";
import { RecordEditDialog } from "./record-edit-dialog";
import { deleteRecordAction } from "./actions";
import { ExportButton } from "@/components/export-button";

interface DataClientProps {
  records: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
  pageSizes: number[];
  tab: "all" | "mine";
  teamMembers: { userId: string; fullName: string }[];
  hasActiveTenant: boolean;
  currentUserId: string;
  currentUserName: string;
  canDelete: boolean;
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
  total,
  page,
  pageSize,
  pageSizes,
  tab,
  teamMembers,
  hasActiveTenant,
  currentUserId,
  currentUserName,
  canDelete,
}: DataClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  /** La paginación y la pestaña viven en la URL: el servidor trae solo la página pedida. */
  const navigate = (next: { tab?: "all" | "mine"; page?: number; size?: number }) => {
    const params = new URLSearchParams({
      tab: next.tab ?? tab,
      page: String(next.page ?? page),
      size: String(next.size ?? pageSize),
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const [viewing, setViewing] = useState<RecordRow | null>(null);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const handleDelete = () => {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteRecordAction(deleting.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Registro borrado");
      setDeleting(null);
    });
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
          <Button variant="ghost" size="icon-sm" title="Ver registro" onClick={() => setViewing(r)}>
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Editar registro" onClick={() => setEditing(r)}>
            <Pencil size={14} />
          </Button>
          {canDelete ? (
            <Button variant="ghost" size="icon-sm" title="Borrar registro" onClick={() => setDeleting(r)}>
              <Trash2 size={14} />
            </Button>
          ) : null}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v: string | null) => v && navigate({ tab: v as "all" | "mine", page: 0 })}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="mine">Mis datos</TabsTrigger>
          </TabsList>
        </Tabs>
        <ExportButton href="/dashboard/export/datos" />
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {tab === "mine" ? "No hay registros tuyos para mostrar." : "Todavía no hay registros cargados."}
        </div>
      ) : (
        <div className="space-y-1">
          <DataTable rows={records} columns={columns} />
          <TablePagination
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={pageSizes}
            count={total}
            onPageChange={(next) => navigate({ page: next })}
            onRowsPerPageChange={(size) => navigate({ size, page: 0 })}
          />
        </div>
      )}

      {viewing ? (
        <RecordDetailDialog
          record={viewing}
          occurredAtLabel={formatOccurredAt(viewing.occurredAt)}
          userLabel={usuarioLabel(viewing, currentUserId, currentUserName, teamMembers)}
          onClose={() => setViewing(null)}
        />
      ) : null}
      {editing ? <RecordEditDialog record={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Borrar registro"
        description="Se borra del historial. No deshace lo que el mensaje haya cargado en Gastos, Insumos, Potreros o Tareas: eso se corrige en cada módulo."
        confirmLabel="Borrar"
        confirmVariant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => !isDeleting && setDeleting(null)}
      />
    </div>
  );
}
