"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  assertCanDeleteOperationalData,
  createExpenseSchema,
  updateExpenseSchema,
  createExpense,
  updateExpense,
  deleteExpense,
  createExpenseCategorySchema,
  createExpenseCategory,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "@repo/core";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function fail<T>(message: string): ActionResult<T> {
  return { success: false, error: message };
}

export async function createExpenseAction(
  input: CreateExpenseInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    const expense = await createExpense(tenantId, parsed.data);
    revalidatePath("/dashboard/expenses");
    return ok({ id: expense.id });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function updateExpenseAction(
  id: string,
  input: UpdateExpenseInput,
): Promise<ActionResult> {
  const parsed = updateExpenseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    await updateExpense(tenantId, id, parsed.data);
    revalidatePath("/dashboard/expenses");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    assertCanDeleteOperationalData(user.capabilities);
    const tenantId = await requireActiveTenantId();
    await deleteExpense(tenantId, id);
    revalidatePath("/dashboard/expenses");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    if (error instanceof Error) return fail(error.message);
    throw error;
  }
}

export async function createExpenseCategoryAction(
  name: string,
  color: string,
): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  const parsed = createExpenseCategorySchema.safeParse({ name, color });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    const category = await createExpenseCategory(tenantId, parsed.data);
    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/preferences");
    return ok({ id: category.id, name: category.name, color: category.color });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}
