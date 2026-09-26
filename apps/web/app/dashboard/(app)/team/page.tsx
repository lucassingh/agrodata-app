import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { assignableRoles, findUserTenants, getTeamMembersForViewer, type FieldRole } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { TeamSections } from "./team-sections";

export const metadata: Metadata = {
  title: "Equipo — AgroData",
};

export default async function TeamPage() {
  const user = await requireUser();
  const memberships = await findUserTenants(user.id);

  const sections = await Promise.all(
    memberships.map(async (m) => ({
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      myRole: m.role as FieldRole,
      assignable: assignableRoles(m.role as FieldRole, user.isSuperAdmin),
      members: await getTeamMembersForViewer({ userId: user.id, email: user.email ?? null }, m.tenantId),
    })),
  );

  const subtitle =
    memberships.length > 1
      ? "Gestioná el equipo de cada uno de tus campos desde una sola pantalla."
      : "Quiénes trabajan en tu campo y qué puede hacer cada uno.";

  return (
    <div className="space-y-6">
      <HeroBanner title="Equipo" subtitle={subtitle} />

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {[
          ["Dueño", "Todo en su campo: cargar, borrar, editar el campo y manejar el equipo."],
          ["Encargado", "Carga y edita; invita operarios. No borra datos."],
          ["Asesor", "Ve y carga todo y arma informes. No borra ni maneja el equipo."],
          ["Operario", "Carga por WhatsApp, sin acceso a la web."],
        ].map(([role, text]) => (
          <div key={role} className="flex gap-2">
            <dt className="font-medium">{role}:</dt>
            <dd className="text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>

      <TeamSections sections={sections} currentUserId={user.id} activeTenantId={user.activeTenantId} />
    </div>
  );
}
