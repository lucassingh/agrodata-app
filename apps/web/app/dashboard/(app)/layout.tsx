import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-heading text-sm font-medium">AgroData</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session?.user?.name} · {session?.user?.platformRole}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/dashboard/sign-in" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
