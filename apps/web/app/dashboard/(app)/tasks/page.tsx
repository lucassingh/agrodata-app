import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listTasks, listPastures, getAllPreferences, getTeamMembers } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { TasksClient } from "./tasks-client";

export const metadata: Metadata = {
  title: "Tareas — AgroData",
};

export default async function TasksPage() {
  const user = await requireUser();

  const [tasks, pastures, preferences, teamMembers] = user.activeTenantId
    ? await Promise.all([
        listTasks(user.activeTenantId),
        listPastures(user.activeTenantId),
        getAllPreferences(user.activeTenantId),
        getTeamMembers(user.activeTenantId),
      ])
    : [[], [], { animalCategories: [] }, []];

  const canDelete = user.capabilities.canDeleteOperationalData;

  return (
    <div className="space-y-6">
      <HeroBanner title="Tareas" subtitle="Planificación y seguimiento de actividades del campo." />
      <TasksClient
        tasks={tasks}
        pastureOptions={pastures.map((p) => ({ value: p.id, label: p.name }))}
        animalOptions={preferences.animalCategories.map((a) => ({ value: a.name, label: a.name }))}
        teamMembers={teamMembers
          .filter((m) => m.status === "ACTIVE")
          .map((m) => ({ userId: m.userId, fullName: m.fullName }))}
        hasActiveTenant={Boolean(user.activeTenantId)}
        currentUserId={user.id}
        currentUserFullName={user.name ?? ""}
        canDelete={canDelete}
      />
    </div>
  );
}
