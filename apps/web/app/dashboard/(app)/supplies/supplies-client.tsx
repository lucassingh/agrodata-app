"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Package, AlertTriangle, Search, Plus, Pencil, Trash2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TablePagination } from "@/components/table-pagination";
import type { Supply, SupplyCategoryRef } from "./types";
import { deleteSupplyAction } from "./actions";
import { SupplyFormDialog } from "./supply-form-dialog";
import { StockAdjustDialog } from "./stock-adjust-dialog";
import { SupplySuccessDialog } from "./supply-success-dialog";
import {
  LOW_STOCK_THRESHOLD,
  accentForCategory,
  isLowStock,
  formatQuantity,
  formatCost,
} from "./supply-format";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

interface SuppliesClientProps {
  supplies: Supply[];
  categories: SupplyCategoryRef[];
  hasActiveTenant: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function SuppliesClient({
  supplies,
  categories,
  hasActiveTenant,
  canEdit,
  canDelete,
}: SuppliesClientProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formState, setFormState] = useState<{ mode: "create" } | { mode: "edit"; supply: Supply } | null>(
    null,
  );
  const [stockTarget, setStockTarget] = useState<{ supply: Supply; direction: "in" | "out" } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Supply | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ id: string; name: string; categoryName: string } | null>(
    null,
  );
  const [isDeleting, startDelete] = useTransition();

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return supplies.filter((s) => {
      if (categoryFilter !== "ALL" && s.categoryId !== categoryFilter) return false;
      if (!q) return true;
      const catName = categoryMap.get(s.categoryId)?.name ?? "";
      return (
        s.name.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q) ||
        (s.supplier ?? "").toLowerCase().includes(q)
      );
    });
  }, [supplies, categoryFilter, search, categoryMap]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalStock = supplies.reduce((sum, s) => sum + s.quantity, 0);
  const lowStockCount = supplies.filter(isLowStock).length;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(0);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteSupplyAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar el insumo");
        return;
      }
      toast.success("Insumo eliminado");
      setDeleteTarget(null);
    });
  };

  const columns: DataTableColumn<Supply>[] = [
    {
      key: "name",
      label: "Insumo",
      render: (s) => {
        const accent = accentForCategory(s.categoryId, s.category.color);
        return (
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
            >
              <Package size={15} />
            </span>
            <p className="font-medium whitespace-nowrap">{s.name}</p>
          </div>
        );
      },
    },
    {
      key: "category",
      label: "Categoría",
      render: (s) => {
        const accent = accentForCategory(s.categoryId, s.category.color);
        return (
          <Badge
            className="border-transparent"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            {s.category.name}
          </Badge>
        );
      },
    },
    {
      key: "quantity",
      label: "Stock",
      className: "text-center",
      render: (s) => {
        const low = isLowStock(s);
        return (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${low ? "text-destructive" : "text-foreground"}`}
          >
            {low ? <AlertTriangle size={14} /> : null}
            {formatQuantity(s.quantity)}
          </span>
        );
      },
    },
    {
      key: "unit",
      label: "Unidad",
      render: (s) => s.unit || "—",
    },
    {
      key: "cost",
      label: "Costo",
      render: (s) => formatCost(s),
    },
    {
      key: "supplier",
      label: "Proveedor",
      render: (s) => (
        <span className="block max-w-[140px] truncate">{s.supplier || "—"}</span>
      ),
    },
    {
      key: "movements",
      label: "Mov.",
      className: "text-center",
      render: (s) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Registrar ingreso"
            className="text-success hover:text-success"
            onClick={() => setStockTarget({ supply: s, direction: "in" })}
          >
            <Plus size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Registrar consumo"
            className="text-primary hover:text-primary"
            onClick={() => setStockTarget({ supply: s, direction: "out" })}
          >
            <Minus size={14} />
          </Button>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (s) => (
        <div className="flex justify-end gap-1">
          {canEdit ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Editar"
              onClick={() => setFormState({ mode: "edit", supply: s })}
            >
              <Pencil size={14} />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => setDeleteTarget(s)}>
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
        <Package className="text-muted-foreground" />
        <p className="font-medium text-foreground">Sin establecimiento activo</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Creá un campo desde el menú lateral o elegí uno existente para administrar el stock de
          insumos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package size={18} />
            </span>
            <div>
              <p className="text-2xl leading-none font-bold">{supplies.length}</p>
              <p className="text-xs text-muted-foreground">Insumos registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0F766E]/10 text-[#0F766E]">
              <Package size={18} />
            </span>
            <div>
              <p className="text-2xl leading-none font-bold">{formatQuantity(totalStock)}</p>
              <p className="text-xs text-muted-foreground">Stock total (unidades)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="flex items-center gap-3">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                categories.length > 0 ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-muted text-muted-foreground"
              }`}
            >
              <Package size={18} />
            </span>
            <div>
              <p className="text-2xl leading-none font-bold">{categories.length}</p>
              <p className="text-xs text-muted-foreground">Categorías</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`rounded-2xl shadow-soft ${lowStockCount > 0 ? "bg-destructive/4" : ""}`}>
          <CardContent className="flex items-center gap-3">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                lowStockCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              }`}
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <p className="text-2xl leading-none font-bold">{lowStockCount}</p>
              <p className="text-xs text-muted-foreground">Stock bajo (≤ {LOW_STOCK_THRESHOLD})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          No hay categorías de insumos configuradas. Andá a <strong>Preferencias &gt; Insumos</strong>{" "}
          para crear al menos una categoría antes de agregar insumos.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <InputGroup className="sm:max-w-xs">
            <InputGroupAddon>
              <Search size={14} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar por nombre, categoría o proveedor..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </InputGroup>
          <Select
            items={[{ value: "ALL", label: "Todas las categorías" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            value={categoryFilter}
            onValueChange={(v: string | null) => v && handleCategoryChange(v)}
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canEdit ? (
          <Button
            disabled={categories.length === 0}
            title={
              categories.length === 0
                ? "Creá una categoría en Preferencias primero"
                : "Agregar insumo al stock"
            }
            onClick={() => setFormState({ mode: "create" })}
          >
            <Plus size={14} />
            Nuevo insumo
          </Button>
        ) : null}
      </div>

      {supplies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="text-muted-foreground" />
          <p className="font-medium text-foreground">No hay insumos cargados</p>
          <p className="text-sm text-muted-foreground">Empezá agregando un insumo con el botón de arriba.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Search className="text-muted-foreground" />
          <p className="font-medium text-foreground">Sin resultados para el filtro</p>
          <p className="text-sm text-muted-foreground">
            Probá cambiando la búsqueda o el filtro de categoría.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <DataTable rows={paged} columns={columns} />
          <TablePagination
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            count={filtered.length}
            onPageChange={setPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setPage(0);
            }}
          />
        </div>
      )}

      {formState ? (
        <SupplyFormDialog
          mode={formState.mode}
          supply={formState.mode === "edit" ? formState.supply : undefined}
          categories={categories}
          onClose={() => setFormState(null)}
          onCreated={(info) => {
            setFormState(null);
            setSuccessInfo(info);
          }}
        />
      ) : null}

      {stockTarget ? (
        <StockAdjustDialog
          supply={stockTarget.supply}
          direction={stockTarget.direction}
          onClose={() => setStockTarget(null)}
        />
      ) : null}

      {successInfo ? (
        <SupplySuccessDialog supply={successInfo} onClose={() => setSuccessInfo(null)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar insumo"
        description={deleteTarget ? `¿Eliminar «${deleteTarget.name}»?` : undefined}
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
