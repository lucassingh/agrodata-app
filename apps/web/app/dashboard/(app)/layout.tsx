import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { findUserTenants } from "@repo/core";
import { AppShell } from "@/components/app-shell";
import { SidebarProvider } from "@/context/sidebar-context";

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
        }}
        memberships={memberships.map((m) => ({
          tenantId: m.tenantId,
          role: m.role,
          tenant: {
            id: m.tenant.id,
            name: m.tenant.name,
            category: m.tenant.category,
          },
        }))}
        signOutAction={signOutAction}
      >
        {children}
      </AppShell>
    </SidebarProvider>
  );
}
