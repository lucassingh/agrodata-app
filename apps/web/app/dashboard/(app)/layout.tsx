import Image from "next/image";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

const PLATFORM_ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  FARM_MANAGER: "Farm Manager",
  OPERATOR: "Operator",
};

function getInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const roleLabel = session?.user?.platformRole
    ? PLATFORM_ROLE_LABEL[session.user.platformRole]
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <Image
          src="/brand/logo-small.png"
          alt="AgroData"
          width={38}
          height={38}
          className="h-9 w-9 object-contain"
        />
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-semibold text-foreground">
              {session?.user?.name}
            </p>
            {roleLabel ? (
              <p className="text-xs font-semibold text-primary">{roleLabel}</p>
            ) : null}
          </div>
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {getInitials(session?.user?.name)}
          </div>
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
