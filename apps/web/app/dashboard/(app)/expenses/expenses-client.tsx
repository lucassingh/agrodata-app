"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DollarSign,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TablePagination } from "@/components/table-pagination";
import type { Expense, ExpenseCategoryRef, ExpenseDashboard } from "./types";
import { deleteExpenseAction } from "./actions";
import { formatExpenseAmount } from "./expense-format";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { ExpenseCategoryDialog } from "./expense-category-dialog";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

interface ExpensesClientProps {
  dashboard: ExpenseDashboard;
  categories: ExpenseCategoryRef[];
  hasActiveTenant: boolean;
  canEdit: boolean;
  canDelete: boolean;
  currency: "ARS" | "USD";
  from: string;
  to: string;
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-input p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ExpensesClient({
  dashboard,
  categories,
  hasActiveTenant,
  canEdit,
  canDelete,
  currency,
  from,
  to,
}: ExpensesClientProps) {
  const router = useRouter();
  const [ivaMode, setIvaMode] = useState<"con" | "sin">("con");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formState, setFormState] = useState<{ mode: "create" } | { mode: "edit"; expense: Expense } | null>(
    null,
  );
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    setPage(0);
  }, [dashboard, search]);

  const pushFilters = (next: Partial<{ currency: "ARS" | "USD"; from: string; to: string }>) => {
    const merged = { currency, from, to, ...next };
    const params = new URLSearchParams();
    params.set("currency", merged.currency);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    router.replace(`/dashboard/expenses?${params.toString()}`);
  };

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dashboard.expenses;
    return dashboard.expenses.filter(
      (e) =>
        e.category.name.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        String(e.amount).includes(q),
    );
  }, [dashboard.expenses, search]);

  const paged = filteredExpenses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleDelete = (expense: Expense) => {
    startDelete(async () => {
      const result = await deleteExpenseAction(expense.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar el gasto.");
        return;
      }
      toast.success("Gasto eliminado.");
    });
  };

  const pieData = dashboard.byCategory
    .filter((c) => c.total > 0)
    .map((c) => ({ name: c.name, value: c.total, color: c.color || "#888" }));

  const lineData = dashboard.monthlyTrends.map((t) => ({ mes: t.month, total: t.total }));

  const columns: DataTableColumn<Expense>[] = [
    {
      key: "category",
      label: "Categoría",
      render: (e) => (
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: e.category.color || "#ccc" }}
          />
          <span className="font-medium">{e.category.name || "Sin categoría"}</span>
        </div>
      ),
    },
    {
      key: "date",
      label: "Fecha",
      render: (e) => e.date.toLocaleDateString("es-AR"),
    },
    {
      key: "currency",
      label: "Moneda",
      render: (e) => e.currency,
    },
    {
      key: "amount",
      label: "Importe",
      render: (e) => <span className="font-semibold">{formatExpenseAmount(e.amount, e.currency)}</span>,
    },
    {
      key: "description",
      label: "Descripción",
      render: (e) => (
        <span className="block max-w-[260px] truncate">{e.description || "—"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (e) => (
        <div className="flex justify-end gap-1">
          {canEdit ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Editar"
              onClick={() => setFormState({ mode: "edit", expense: e })}
            >
              <Pencil size={14} />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Eliminar"
              disabled={isDeleting}
              onClick={() => handleDelete(e)}
            >
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
        <Wallet className="text-muted-foreground" />
        <p className="font-medium text-foreground">Sin establecimiento activo</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Creá un campo desde el menú lateral o elegí uno existente. Después vas a poder ver el
          resumen de gastos y las categorías acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="flex flex-wrap items-center gap-4">
          <SegmentedToggle
            value={currency}
            options={[
              { value: "ARS" as const, label: "ARS" },
              { value: "USD" as const, label: "USD" },
            ]}
            onChange={(v) => pushFilters({ currency: v })}
          />
          <SegmentedToggle
            value={ivaMode}
            options={[
              { value: "con" as const, label: "Con IVA" },
              { value: "sin" as const, label: "Sin IVA" },
            ]}
            onChange={setIvaMode}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => pushFilters({ from: e.target.value })}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            />
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => pushFilters({ to: e.target.value })}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <DollarSign size={12} />
              {currency}
            </span>
            <span className="rounded-full bg-[#D97706]/10 px-2.5 py-1 text-xs font-medium text-[#D97706]">
              {ivaMode === "con" ? "Con IVA" : "Sin IVA"}
            </span>
            <div className="h-8 w-px bg-border" />
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wallet size={16} />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold leading-none">
                {formatExpenseAmount(dashboard.totalAmount, currency)}
              </p>
            </div>
            <Button
              onClick={() => {
                if (categories.length === 0) {
                  toast.error("Creá primero al menos una categoría de gasto.");
                  return;
                }
                setFormState({ mode: "create" });
              }}
            >
              <Plus size={14} />
              Nuevo gasto
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
                  <Layers size={16} />
                </span>
                <p className="font-semibold">Categorías</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Agregar categoría"
                onClick={() => setCategoryDialogOpen(true)}
              >
                <Plus size={14} />
              </Button>
            </div>
            {dashboard.byCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay categorías. Agregá una con el botón +.
              </p>
            ) : (
              <ul className="space-y-2">
                {dashboard.byCategory.map((row) => (
                  <li key={row.categoryId} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: row.color || "#ccc",
                          boxShadow: `0 0 0 3px ${row.color || "#ccc"}33`,
                        }}
                      />
                      <span className="truncate text-sm font-medium">{row.name}</span>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${row.color || "#ccc"}1a`, color: row.color || "#666" }}
                    >
                      {formatExpenseAmount(row.total, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#D97706]/10 text-[#D97706]">
                <DollarSign size={16} />
              </span>
              <p className="font-semibold">Distribución</p>
            </div>
            {pieData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sin datos para el gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatExpenseAmount(Number(value), currency)} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "0.75rem", fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TrendingUp size={16} />
              </span>
              <p className="font-semibold">Tendencia mensual</p>
            </div>
            {lineData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sin series temporales.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(value) => formatExpenseAmount(Number(value), currency)} />
                  <Line type="monotone" dataKey="total" stroke="#2D6A4F" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Detalle de gastos</p>
            <p className="hidden text-xs text-muted-foreground md:block">
              Editá o eliminá registros según tu rol.
            </p>
          </div>
          <InputGroup className="sm:max-w-xs">
            <InputGroupAddon>
              <Search size={14} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar por categoría o descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        {dashboard.expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Todavía no hay gastos cargados en el período seleccionado.
          </div>
        ) : (
          <div className="space-y-1">
            <DataTable rows={paged} columns={columns} />
            <TablePagination
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              count={filteredExpenses.length}
              onPageChange={setPage}
              onRowsPerPageChange={(n) => {
                setRowsPerPage(n);
                setPage(0);
              }}
            />
          </div>
        )}
      </div>

      {formState ? (
        <ExpenseFormDialog
          mode={formState.mode}
          expense={formState.mode === "edit" ? formState.expense : undefined}
          categories={categories}
          defaultCurrency={currency}
          ivaMode={ivaMode}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {categoryDialogOpen ? (
        <ExpenseCategoryDialog
          onClose={() => setCategoryDialogOpen(false)}
          onCreated={() => setCategoryDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
