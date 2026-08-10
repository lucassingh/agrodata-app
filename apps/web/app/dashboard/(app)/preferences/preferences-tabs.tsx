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

interface PreferencesTabsProps {
  memberships: Array<{
    tenantId: string;
    role: "ADMIN" | "USER_GENERAL";
    tenant: {
      id: string;
      name: string;
      category: string;
      timezone: string;
      baseCurrency: string;
      location: string | null;
      totalHa: number | null;
    };
  }>;
  activeTenantId: string | null;
  isOwner: boolean;
  canManage: boolean;
  canDelete: boolean;
  animalCategories: Array<{ id: string; name: string }>;
  cropConfigs: Array<{ id: string; name: string }>;
  supplyCategories: Array<{ id: string; name: string; code: string | null }>;
  rodeos: Array<{ id: string; name: string; description: string | null }>;
  expenseCategories: Array<{ id: string; name: string; color: string }>;
}

export function PreferencesTabs({
  memberships,
  activeTenantId,
  isOwner,
  canManage,
  canDelete,
  animalCategories,
  cropConfigs,
  supplyCategories,
  rodeos,
  expenseCategories,
}: PreferencesTabsProps) {
  return (
    <Tabs defaultValue="campo">
      <TabsList className="w-full flex-wrap justify-start rounded-xl border border-border bg-card p-1 shadow-soft sm:w-auto">
        <TabsTrigger value="campo">Campo</TabsTrigger>
        <TabsTrigger value="animales">Animales</TabsTrigger>
        <TabsTrigger value="rodeos">Rodeos</TabsTrigger>
        <TabsTrigger value="cultivos">Cultivos</TabsTrigger>
        <TabsTrigger value="insumos">Insumos</TabsTrigger>
        <TabsTrigger value="gastos">Gastos</TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="campo">
          <CampoTab memberships={memberships} activeTenantId={activeTenantId} isOwner={isOwner} />
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
      </div>
    </Tabs>
  );
}
