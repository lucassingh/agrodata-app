"use client";

import { Sprout, UsersRound, PiggyBank } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CampoTab } from "./campo-tab";
import { SimpleCategoryTab } from "./simple-category-tab";
import { SupplyCategoriesTab } from "./supply-categories-tab";
import { RodeosTab } from "./rodeos-tab";
import {
  createAnimalCategoryAction,
  removeAnimalCategoryAction,
  createCropConfigAction,
  removeCropConfigAction,
  createExpenseCategoryAction,
  removeExpenseCategoryAction,
} from "./actions";
import { colorForKey } from "@/lib/color-for-key";
import type { ExchangeRateKind } from "@repo/core/economy/exchange-rates";
import type { VatCondition } from "@repo/core/economy/vat";
import type { FarmActivity } from "@repo/core/tenants/tenant-labels";
import type { FieldRole } from "@repo/core/auth/field-roles";
import { AlertsTab, type AlertsTabProps } from "./alerts-tab";

interface PreferencesTabsProps {
  memberships: Array<{
    tenantId: string;
    role: FieldRole;
    tenant: {
      id: string;
      name: string;
      category: string;
      timezone: string;
      baseCurrency: string;
      exchangeRateKind: ExchangeRateKind;
      activities: FarmActivity[];
      vatCondition: VatCondition;
      location: string | null;
      totalHa: number | null;
    };
  }>;
  activeTenantId: string | null;
  /** Pestaña que abre (?tab=…, ej. el link «Configurar» del panel de avisos). */
  defaultTab?: string;
  alerts: AlertsTabProps;
  canEditField: boolean;
  canManage: boolean;
  canDelete: boolean;
  animalCategories: Array<{ id: string; name: string }>;
  cropConfigs: Array<{ id: string; name: string }>;
  supplyCategories: Array<{ id: string; name: string; code: string | null }>;
  rodeos: Array<{ id: string; name: string; description: string | null }>;
  expenseCategories: Array<{ id: string; name: string; color: string }>;
}

const TAB_VALUES = ["campo", "animales", "rodeos", "cultivos", "insumos", "gastos", "avisos"];

export function PreferencesTabs({
  memberships,
  activeTenantId,
  defaultTab,
  alerts,
  canEditField,
  canManage,
  canDelete,
  animalCategories,
  cropConfigs,
  supplyCategories,
  rodeos,
  expenseCategories,
}: PreferencesTabsProps) {
  return (
    <Tabs defaultValue={defaultTab && TAB_VALUES.includes(defaultTab) ? defaultTab : "campo"}>
      <TabsList className="w-full justify-start overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-soft sm:w-auto">
        <TabsTrigger value="campo">Campo</TabsTrigger>
        <TabsTrigger value="animales">Animales</TabsTrigger>
        <TabsTrigger value="rodeos">Rodeos</TabsTrigger>
        <TabsTrigger value="cultivos">Cultivos</TabsTrigger>
        <TabsTrigger value="insumos">Insumos</TabsTrigger>
        <TabsTrigger value="gastos">Gastos</TabsTrigger>
        <TabsTrigger value="avisos">Avisos</TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="campo">
          <CampoTab memberships={memberships} activeTenantId={activeTenantId} canEditField={canEditField} />
        </TabsContent>

        <TabsContent value="animales">
          <SimpleCategoryTab
            items={animalCategories}
            canManage={canManage}
            canDelete={canDelete}
            addPlaceholder="Ej. toros, vacas, novillos"
            addButtonLabel="Agregar categoría"
            emptyIcon={<UsersRound />}
            emptyTitle="Sin categorías de animales"
            emptyDescription="Agregá tipos de animales que usás en el establecimiento (ej. vacas, ovejas)."
            deleteDialogTitle="Eliminar categoría"
            deleteDialogDescription={(name) => `¿Eliminar la categoría «${name}»?`}
            onCreate={createAnimalCategoryAction}
            onDelete={removeAnimalCategoryAction}
          />
        </TabsContent>

        <TabsContent value="rodeos">
          <RodeosTab items={rodeos} canManage={canManage} canDelete={canDelete} />
        </TabsContent>

        <TabsContent value="cultivos">
          <SimpleCategoryTab
            items={cropConfigs}
            canManage={canManage}
            canDelete={canDelete}
            addPlaceholder="Ej. soja, maíz, trigo"
            addButtonLabel="Agregar cultivo"
            emptyIcon={<Sprout />}
            emptyTitle="Sin cultivos"
            emptyDescription="Agregá los cultivos que vas a registrar en potreros y tareas."
            deleteDialogTitle="Eliminar cultivo"
            deleteDialogDescription={(name) => `¿Eliminar «${name}»?`}
            onCreate={createCropConfigAction}
            onDelete={removeCropConfigAction}
          />
        </TabsContent>

        <TabsContent value="insumos">
          <SupplyCategoriesTab
            items={supplyCategories}
            canManage={canManage}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="gastos">
          <SimpleCategoryTab
            items={expenseCategories}
            canManage={canManage}
            canDelete={canDelete}
            addPlaceholder="Concepto de gasto"
            addButtonLabel="Agregar concepto"
            emptyIcon={<PiggyBank />}
            emptyTitle="Sin conceptos de gastos"
            emptyDescription="Definí cómo se van a agrupar los gastos del establecimiento."
            deleteDialogTitle="Eliminar categoría de gasto"
            deleteDialogDescription={(name) => `¿Eliminar «${name}»?`}
            onCreate={(name) => createExpenseCategoryAction(name, colorForKey(name))}
            onDelete={removeExpenseCategoryAction}
          />
        </TabsContent>

        <TabsContent value="avisos">
          <AlertsTab {...alerts} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
