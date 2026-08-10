import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { findUserTenants, getTeamMembersForViewer } from "@repo/core";
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
      myRole: m.role,
      members: await getTeamMembersForViewer(
        { userId: user.id, isSuperAdmin: user.isSuperAdmin, email: user.email ?? null },
        m.tenantId,
      ),
    })),
  );

  const adminTenants = memberships
    .filter((m) => m.role === "ADMIN")
    .map((m) => ({ id: m.tenantId, name: m.tenant.name }));

  const subtitle =
    memberships.length > 1
      ? "Gestioná el equipo de cada uno de tus campos desde una sola pantalla."
      : "Administradores y usuarios que tienen acceso a tu campo.";

  return (
    <div className="space-y-6">
      <HeroBanner title="Equipo" subtitle={subtitle} />

      <p className="text-sm text-muted-foreground">
        Los usuarios generales (Operator) se conectan por WhatsApp — todavía no está
        integrado (Fase 4 del roadmap).
      </p>

      <TeamSections
        sections={sections}
        adminTenants={adminTenants}
        currentUserId={user.id}
        isOwner={user.isSuperAdmin}
        capabilities={user.capabilities}
        activeTenantId={user.activeTenantId}
      />
    </div>
  );
}
