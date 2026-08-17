"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, ChevronDown, Eye, Trash2, Check, CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/format-date-only";
import type { ComboboxOption } from "@/components/combobox";
import type { Task, TaskType } from "./types";
import { deleteTaskAction, toggleTaskStatusAction } from "./actions";
import { TASK_TYPE_CONFIG, TASK_TYPE_ORDER } from "./task-constants";
import { TASK_TYPE_LABEL, taskSummary } from "./task-labels";
import { TaskCreateDialog } from "./task-create-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskCompleteSuccessDialog } from "./task-complete-success-dialog";

function formatDeadline(date: Date): string {
  return formatDateOnly(date, { day: "2-digit", month: "short", year: "numeric" });
}

/** `date` (deadline) se guarda como medianoche UTC -- se compara contra "hoy"
 *  también anclado a medianoche UTC para no correr el límite un día por el
 *  huso horario local (ver `formatDateOnly`). */
function isOverdue(date: Date): boolean {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  return date < todayUtc;
}

function initials(name: string, lastname: string): string {
  return `${name[0] ?? ""}${lastname[0] ?? ""}`.toUpperCase();
}

interface TasksClientProps {
  tasks: Task[];
  pastureOptions: ComboboxOption[];
  animalOptions: ComboboxOption[];
  teamMembers: { userId: string; fullName: string }[];
  hasActiveTenant: boolean;
  currentUserId: string;
  currentUserFullName: string;
  canDelete: boolean;
}

export function TasksClient({
  tasks,
  pastureOptions,
  animalOptions,
  teamMembers,
  hasActiveTenant,
  currentUserId,
  currentUserFullName,
  canDelete,
}: TasksClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [createType, setCreateType] = useState<TaskType | null>(null);
  const [detailTarget, setDetailTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [successTask, setSuccessTask] = useState<Task | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [, startToggle] = useTransition();

  const scopedTasks = useMemo(
    () => (activeTab === "mine" ? tasks.filter((t) => t.responsibleId === currentUserId) : tasks),
    [tasks, activeTab, currentUserId],
  );
  const pending = useMemo(() => scopedTasks.filter((t) => t.status === "PENDING"), [scopedTasks]);
  const completed = useMemo(() => scopedTasks.filter((t) => t.status === "COMPLETED"), [scopedTasks]);

  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? (tasks.filter((t) => t.status === "COMPLETED").length / totalTasks) * 100 : 0;

  const handleToggle = (task: Task) => {
    startToggle(async () => {
      const result = await toggleTaskStatusAction(task.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar la tarea");
        return;
      }
      if (task.status === "PENDING" && result.data.status === "COMPLETED") {
        setSuccessTask({ ...task, status: "COMPLETED" });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteTaskAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar la tarea");
        return;
      }
      toast.success("Tarea eliminada");
      setDeleteTarget(null);
    });
  };

  const columns: DataTableColumn<Task>[] = [
    {
      key: "toggle",
      label: "",
      className: "w-10",
      render: (t) => (
        <button
          type="button"
          onClick={() => handleToggle(t)}
          title={t.status === "COMPLETED" ? "Volver a pendiente" : "Marcar como completada"}
          className={cn(
            "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
            t.status === "COMPLETED"
              ? "border-success bg-success text-success-foreground"
              : "border-muted-foreground/40 hover:border-muted-foreground",
          )}
        >
          {t.status === "COMPLETED" ? <Check size={12} /> : null}
        </button>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (t) => {
        const config = TASK_TYPE_CONFIG[t.type];
        const Icon = config.icon;
        return (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
            style={{ backgroundColor: config.bg, color: config.color }}
          >
            <Icon size={11} />
            {TASK_TYPE_LABEL[t.type].split(" ")[0]}
          </span>
        );
      },
    },
    {
      key: "summary",
      label: "Tarea",
      render: (t) => (
        <span className={cn(t.status === "COMPLETED" && "text-muted-foreground line-through")}>
          {taskSummary(t)}
        </span>
      ),
    },
    {
      key: "deadline",
      label: "Fecha límite",
      render: (t) => {
        const overdue = t.status === "PENDING" && isOverdue(t.deadline);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap",
              overdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <CalendarDays size={13} />
            {formatDeadline(t.deadline)}
          </span>
        );
      },
    },
    {
      key: "responsible",
      label: "Responsable",
      render: (t) =>
        t.responsible ? (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback className="text-[10px]">
                {initials(t.responsible.name, t.responsible.lastname)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm whitespace-nowrap">
              {t.responsible.name} {t.responsible.lastname}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      label: "",
      render: (t) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => setDetailTarget(t)}>
            <Eye size={14} />
          </Button>
          {canDelete ? (
            <Button variant="ghost" size="icon-sm" title="Eliminar tarea" onClick={() => setDeleteTarget(t)}>
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
        <CheckCircle2 className="text-muted-foreground" />
        <p className="font-medium text-foreground">Sin establecimiento activo</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Creá un campo desde el menú lateral o elegí uno existente. Después vas a poder planificar y ver tareas
          acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(v: string | null) => v && setActiveTab(v as "all" | "mine")}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="mine">Mis Tareas</TabsTrigger>
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                disabled={!hasActiveTenant}
                title={!hasActiveTenant ? "Elegí o creá un establecimiento para cargar tareas." : undefined}
              />
            }
          >
            <Plus size={14} />
            Nueva Tarea
            <ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {TASK_TYPE_ORDER.map((type) => {
                const config = TASK_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <DropdownMenuItem key={type} onClick={() => setCreateType(type)}>
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      <Icon size={13} />
                    </span>
                    {TASK_TYPE_LABEL[type]}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-border p-4 shadow-soft">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {tasks.filter((t) => t.status === "COMPLETED").length} de {totalTasks} tareas completadas
          </span>
          <span className="font-semibold">{totalTasks > 0 ? `${Math.round(progressPct)}%` : "0%"}</span>
        </div>
        <Progress value={progressPct} className="mt-2" />
      </div>

      <TaskSection
        title="Pendientes"
        color="#D97706"
        bg="#FFFBEB"
        tasks={pending}
        emptyMessage="No hay tareas pendientes"
        columns={columns}
      />
      <TaskSection
        title="Completados"
        color="#16A34A"
        bg="#F0FDF4"
        tasks={completed}
        emptyMessage="No hay tareas completadas"
        columns={columns}
      />

      {createType ? (
        <TaskCreateDialog
          taskType={createType}
          pastureOptions={pastureOptions}
          animalOptions={animalOptions}
          teamMembers={teamMembers}
          currentUserFullName={currentUserFullName}
          onClose={() => setCreateType(null)}
        />
      ) : null}

      {detailTarget ? <TaskDetailDialog task={detailTarget} onClose={() => setDetailTarget(null)} /> : null}

      {successTask ? (
        <TaskCompleteSuccessDialog task={successTask} onClose={() => setSuccessTask(null)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar tarea"
        description={
          deleteTarget
            ? `¿Estás seguro de que querés eliminar la tarea ${taskSummary(deleteTarget)}? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface TaskSectionProps {
  title: string;
  color: string;
  bg: string;
  tasks: Task[];
  emptyMessage: string;
  columns: DataTableColumn<Task>[];
}

function TaskSection({ title, color, bg, tasks, emptyMessage, columns }: TaskSectionProps) {
  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ backgroundColor: bg, color }}
      >
        <span className="text-sm font-bold">{title}</span>
        <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${color}26` }}>
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <DataTable rows={tasks} columns={columns} />
      )}
    </div>
  );
}
