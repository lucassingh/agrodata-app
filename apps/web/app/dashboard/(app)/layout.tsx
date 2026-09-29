import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { findUserTenants } from "@repo/core";
import { AppShell } from "@/components/app-shell";
import { SidebarProvider } from "@/context/sidebar-context";

/** Vercel marca cada deploy: producción no lleva cartel; develop (Preview) y la
 *  máquina de cada uno sí, para no cargar datos en el lugar equivocado. */
function environmentLabel(): string | null {
  if (process.env.VERCEL_ENV === "production") return null;
  if (process.env.VERCEL_ENV === "preview") return "Prueba (develop)";
  return "Local";
}

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const memberships = await findUserTenants(user.id);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/dashboard/sign-in" });
  }

  return (
    <SidebarProvider>
      <AppShell
        user={{
          name: user.name ?? "",
          email: user.email ?? "",
          platformRole: user.platformRole,
          capabilities: user.capabilities,
          activeTenantId: user.activeTenantId,
          isStaff: user.isSuperAdmin,
        }}
        memberships={memberships.map((m) => ({
          tenantId: m.tenantId,
          role: m.role,
          tenant: {
            id: m.tenant.id,
            name: m.tenant.name,
            category: m.tenant.category,
            activities: m.tenant.activities,
          },
        }))}
        signOutAction={signOutAction}
        environmentLabel={environmentLabel()}
      >
        {children}
      </AppShell>
    </SidebarProvider>
  );
}
