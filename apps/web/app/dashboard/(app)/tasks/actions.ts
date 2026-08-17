"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  assertCanDeleteOperationalData,
  createTaskSchema,
  createTask,
  toggleTaskStatus,
  deleteTask,
  findTask,
  createRecord,
  type CreateTaskInput,
} from "@repo/core";
import { TASK_TO_RECORD_TYPE, taskSummary } from "./task-labels";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function fail<T>(message: string): ActionResult<T> {
  return { success: false, error: message };
}

export async function createTaskAction(
  input: CreateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    const task = await createTask(tenantId, parsed.data);
    revalidatePath("/dashboard/tasks");
    return ok({ id: task.id });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function toggleTaskStatusAction(
  id: string,
): Promise<ActionResult<{ status: "PENDING" | "COMPLETED" }>> {
  try {
    const tenantId = await requireActiveTenantId();
    const task = await toggleTaskStatus(tenantId, id);
    revalidatePath("/dashboard/tasks");
    return ok({ status: task.status });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    assertCanDeleteOperationalData(user.capabilities);
    const tenantId = await requireActiveTenantId();
    await deleteTask(tenantId, id);
    revalidatePath("/dashboard/tasks");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    if (error instanceof Error) return fail(error.message);
    throw error;
  }
}

/** Puerto directo de "Agregar Dato" del legacy: paso manual y opcional que se
 *  ofrece justo después de completar una tarea (nunca automático). */
export async function addTaskRecordAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const tenantId = await requireActiveTenantId();
    const task = await findTask(tenantId, id);
    const pasturesText = task.pastures.map((p) => p.pasture?.name ?? p.pastureId).join(", ");
    const animalsText = task.animals.map((a) => `${a.quantity} ${a.animalType}`).join(", ");
    await createRecord(tenantId, {
      type: TASK_TO_RECORD_TYPE[task.type],
      occurredAt: new Date().toISOString(),
      data: {
        taskId: task.id,
        taskType: task.type,
        summary: taskSummary(task),
        pastures: pasturesText,
        animals: animalsText,
        treatment: task.treatment,
        crop: task.crop,
      },
      source: "plataforma",
      userId: user.id,
    });
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}
