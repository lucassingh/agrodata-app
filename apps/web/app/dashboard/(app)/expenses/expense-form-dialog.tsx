"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpenseAction, updateExpenseAction } from "./actions";
import type { Expense, ExpenseCategoryRef } from "./types";
import { CampaignPicker, type CampaignOption } from "@/components/campaign-picker";
import { suggestVatRate, VAT_RATE_LABEL, VAT_RATES } from "@repo/core/economy/vat";

interface ExpenseFormDialogProps {
  mode: "create" | "edit";
  expense?: Expense;
  categories: ExpenseCategoryRef[];
  campaignOptions: CampaignOption[];
  initialCampaignIds: string[];
  defaultCurrency: "ARS" | "USD";
  /** Valor inicial del IVA para un gasto NUEVO (el toggle de la barra de filtros).
   *  Al editar se usa el valor real del gasto: el legacy lo pisaba con el toggle
   *  global, y eso cambiaba en silencio el IVA de gastos ya cargados. */
  ivaMode: "con" | "sin";
  onClose: () => void;
}

const VAT_ITEMS = VAT_RATES.map((rate) => ({ value: String(rate), label: VAT_RATE_LABEL[String(rate)]! }));

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ExpenseFormDialog({
  mode,
  expense,
  categories,
  campaignOptions,
  initialCampaignIds,
  defaultCurrency,
  ivaMode,
  onClose,
}: ExpenseFormDialogProps) {
  const [campaignIds, setCampaignIds] = useState<string[]>(initialCampaignIds);
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [currency, setCurrency] = useState<"ARS" | "USD">(expense?.currency ?? defaultCurrency);
  const [date, setDate] = useState(expense ? dateInputValue(expense.date) : todayISO());
  const [description, setDescription] = useState(expense?.description ?? "");
  const [withIva, setWithIva] = useState(expense ? expense.withIva : ivaMode === "con");
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";
  const [vatRate, setVatRate] = useState(String(expense?.vatRate ?? suggestVatRate(categoryName(categoryId))));
  // Mientras no se elija a mano, la alícuota sigue a la categoría.
  const [vatTouched, setVatTouched] = useState(expense?.vatRate != null);
  const chooseCategory = (id: string) => {
    setCategoryId(id);
    if (!vatTouched) setVatRate(String(suggestVatRate(categoryName(id))));
  };
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!categoryId) {
      setError("Elegí una categoría de gasto.");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Ingresá un importe válido mayor a 0.");
      return;
    }
    if (!date) {
      setError("Elegí una fecha.");
      return;
    }
    setError(null);

    const payload = {
      categoryId,
      amount: amountNum,
      currency,
      date,
      description: description.trim() || undefined,
      withIva,
      vatRate: Number(vatRate),
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createExpenseAction(payload, campaignIds);
        if (!result.success) {
          toast.error(result.error ?? "No se pudo registrar el gasto.");
          return;
        }
        toast.success("Gasto registrado.");
        onClose();
        return;
      }

      const result = await updateExpenseAction(expense!.id, payload, campaignIds);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo registrar el gasto.");
        return;
      }
      toast.success("Gasto actualizado.");
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo gasto" : "Editar gasto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              items={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categoryId}
              onValueChange={(v: string | null) => v && chooseCategory(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Importe</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                items={[
                  { value: "ARS", label: "ARS" },
                  { value: "USD", label: "USD" },
                ]}
                value={currency}
                onValueChange={(v: string | null) => v && setCurrency(v as "ARS" | "USD")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <CampaignPicker options={campaignOptions} value={campaignIds} onChange={setCampaignIds} />

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={withIva} onCheckedChange={(checked: boolean) => setWithIva(checked)} />
            El importe incluye IVA
          </label>

          <div className="space-y-2">
            <Label htmlFor="expense-vat-rate">Alícuota de IVA</Label>
            <Select
              items={VAT_ITEMS}
              value={vatRate}
              onValueChange={(v: string | null) => {
                if (!v) return;
                setVatRate(v);
                setVatTouched(true);
              }}
            >
              <SelectTrigger id="expense-vat-rate" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VAT_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sugerida según la categoría (maquinaria y labores 10,5 %, servicios públicos 27 %, el resto 21 %).
              Confirmala con tu contador.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending} onClick={handleSave}>
            {isPending ? "Guardando..." : mode === "create" ? "Guardar" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
