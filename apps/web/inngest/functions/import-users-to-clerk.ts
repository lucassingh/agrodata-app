import * as Sentry from "@sentry/nextjs";
import { importUserToClerk, usersPendingClerkImport, type ClerkImportResult } from "@repo/core";
import { inngest } from "../client";
import { clerkImportRequested } from "../events";

/** Copia a Clerk a quienes ya tenían cuenta, con su contraseña (hash de bcrypt), para pasar el
 *  login a Clerk sin pedirle a nadie que se registre de nuevo. Corre en el entorno de cada base:
 *  así nunca se conecta local a producción. Se puede repetir: saltea a quien ya está en Clerk.
 *  Cada persona es un paso propio: si falla una, las demás igual pasan. */
export const importUsersToClerk = inngest.createFunction(
  {
    id: "import-users-to-clerk",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ event: clerkImportRequested }],
  },
  async ({ step }) => {
    const userIds = await step.run("load-users", () => usersPendingClerkImport());

    const outcomes: ({ userId: string } & ClerkImportResult)[] = [];
    for (const userId of userIds) {
      const result = await step.run(`import-${userId}`, async (): Promise<ClerkImportResult> => {
        try {
          return await importUserToClerk(userId);
        } catch (error) {
          console.error("[clerk-import] no se pudo copiar", { userId, error });
          Sentry.captureException(error, { tags: { flow: "clerk-import" } });
          return { outcome: "skipped", detail: error instanceof Error ? error.message : "error desconocido" };
        }
      });
      outcomes.push({ userId, ...result });
    }

    const count = (outcome: ClerkImportResult["outcome"]) => outcomes.filter((o) => o.outcome === outcome).length;
    return { created: count("created"), linked: count("linked"), skipped: count("skipped"), outcomes };
  },
);
