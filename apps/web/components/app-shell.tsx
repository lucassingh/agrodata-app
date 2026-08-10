"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  DollarSign,
  Download,
  Fence,
  LogOut,
  Map as MapIcon,
  Package,
  PieChart,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/context/sidebar-context";
import { CreateTenantDialog } from "@/components/create-tenant-dialog";
import { setActiveTenantAction } from "@/app/dashboard/(app)/_lib/tenant-actions";
import { cn } from "@/lib/utils";
import type { Capabilities, PlatformRole } from "@repo/core";

const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  OWNER: "Owner",
  FARM_MANAGER: "Farm Manager",
  OPERATOR: "Operator",
};

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface AppShellUser {
  name: string;
  email: string;
  platformRole: PlatformRole;
  capabilities: Capabilities;
  activeTenantId: string | null;
}

interface Membership {
  tenantId: string;
  role: "ADMIN" | "USER_GENERAL";
  tenant: { id: string; name: string; category: string };
}

interface AppShellProps {
  user: AppShellUser;
  memberships: Membership[];
  children: ReactNode;
  signOutAction: () => Promise<void>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

function getTenantInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function AppShell({ user, memberships, children, signOutAction }: AppShellProps) {
  const { collapsed, setCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [dataBadge, setDataBadge] = useState(0);
  const [createFieldOpen, setCreateFieldOpen] = useState(false);

  useEffect(() => {
    const onAdded = () => setDataBadge((n) => n + 1);
    const onClear = () => setDataBadge(0);
    window.addEventListener("agrodata:record-added", onAdded);
    window.addEventListener("agrodata:record-badge-clear", onClear);
    return () => {
      window.removeEventListener("agrodata:record-added", onAdded);
      window.removeEventListener("agrodata:record-badge-clear", onClear);
    };
  }, []);

  useEffect(() => {
    if (pathname === "/dashboard/data") setDataBadge(0);
  }, [pathname]);

  const campoItems: NavItem[] = [
    { label: "Cómo empezar", href: "/dashboard/how-start", icon: <BookOpen size={18} /> },
    { label: "Resumen", href: "/dashboard/summary", icon: <PieChart size={18} /> },
    {
      label: "Datos",
      href: "/dashboard/data",
      icon: <Database size={18} />,
      badge: dataBadge,
    },
    { label: "Mapa", href: "/dashboard/map", icon: <MapIcon size={18} /> },
  ];
  const gestionItems: NavItem[] = [
    { label: "Potreros", href: "/dashboard/pastures", icon: <Fence size={18} /> },
    { label: "Tareas", href: "/dashboard/tasks", icon: <ClipboardList size={18} /> },
    { label: "Gastos", href: "/dashboard/expenses", icon: <DollarSign size={18} /> },
    { label: "Insumos", href: "/dashboard/supplies", icon: <Package size={18} /> },
  ];
  const configItems: NavItem[] = [
    { label: "Equipo", href: "/dashboard/team", icon: <Users size={18} /> },
    { label: "Preferencias", href: "/dashboard/preferences", icon: <Settings size={18} /> },
  ];

  const activeMembership = memberships.find((m) => m.tenantId === user.activeTenantId);
  const activeTenant = activeMembership?.tenant;
  const canSwitchActiveTenant = memberships.length > 1;

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === user.activeTenantId) return;
    await setActiveTenantAction(tenantId);
    router.refresh();
  };

  function renderNavSection(title: string, items: NavItem[]) {
    return (
      <div className="mb-1">
        {!collapsed ? (
          <p className="px-3 py-2 text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
        ) : null}
        {items.map((item) => {
          const selected = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "mx-1 mb-1 flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
                collapsed && "mx-auto w-10 justify-center px-0",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-primary-dark hover:bg-muted",
              )}
            >
              {item.icon}
              {!collapsed ? <span className="flex-1">{item.label}</span> : null}
              {item.badge !== undefined && item.badge > 0 ? (
                <Badge
                  variant="destructive"
                  className={cn(
                    "size-4 justify-center rounded-full p-0 text-[9px]",
                    collapsed && "absolute -mt-5 ml-4",
                  )}
                >
                  {item.badge}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200",
          collapsed ? "w-[86px]" : "w-[260px]",
        )}
      >
        <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-2")}>
          <Image
            src={collapsed ? "/brand/logo-small.png" : "/brand/logo.png"}
            alt="AgroData"
            width={collapsed ? 38 : 136}
            height={collapsed ? 38 : 30}
            className="h-auto w-auto"
          />
        </div>

        {activeTenant ? (
          <div className={cn("px-3 py-2", collapsed && "flex justify-center px-0")}>
            {collapsed ? (
              <div
                title={activeTenant.name}
                className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
              >
                {getTenantInitials(activeTenant.name)}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-accent px-2.5 py-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {getTenantInitials(activeTenant.name)}
                </div>
                <span className="truncate text-xs font-bold text-primary-dark">
                  {activeTenant.name}
                </span>
              </div>
            )}
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto py-2">
          {renderNavSection("Campo", campoItems)}
          {!collapsed ? <div className="mx-3 my-1 border-t border-border" /> : null}
          {renderNavSection("Gestión", gestionItems)}
          {!collapsed ? <div className="mx-3 my-1 border-t border-border" /> : null}
          {renderNavSection("Configuración", configItems)}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>

          <div className="flex items-center gap-1">
            <a
              href="https://wa.me/5491100000000"
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp de soporte"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <Image src="/brand/whatsapp.svg" alt="" width={20} height={20} />
            </a>
            <Button variant="ghost" size="icon" title="Descargar reporte">
              <Download size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Nueva tarea"
              onClick={() => router.push("/dashboard/tasks")}
            >
              <ClipboardList size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Nuevo dato"
              onClick={() => router.push("/dashboard/data")}
            >
              <Plus size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Configuración del campo"
              onClick={() => router.push("/dashboard/preferences")}
            >
              <Settings size={18} />
            </Button>

            <div className="mx-1 h-6 w-px bg-border" />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {getInitials(user.name)}
                </div>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-xs font-semibold text-foreground">{user.name}</p>
                  <p className="text-[11px] font-semibold text-primary">
                    {PLATFORM_ROLE_LABEL[user.platformRole]}
                  </p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-sm font-bold text-foreground">
                    {user.name}
                  </DropdownMenuLabel>

                  {canSwitchActiveTenant ? (
                    memberships.map((m) => {
                      const isActive = m.tenantId === user.activeTenantId;
                      return (
                        <DropdownMenuItem
                          key={m.tenantId}
                          onClick={() => void handleSwitchTenant(m.tenantId)}
                          className={cn(isActive && "bg-accent")}
                        >
                          <div
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground",
                              isActive && "ring-2 ring-primary ring-offset-1",
                            )}
                          >
                            {getTenantInitials(m.tenant.name)}
                          </div>
                          <span className={cn("text-sm", isActive && "font-bold")}>
                            {m.tenant.name}
                          </span>
                        </DropdownMenuItem>
                      );
                    })
                  ) : activeTenant ? (
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-bold text-muted-foreground">Campo</p>
                      <p className="text-sm font-bold">{activeTenant.name}</p>
                    </div>
                  ) : null}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  {user.capabilities.canCreateField ? (
                    <DropdownMenuItem onClick={() => setCreateFieldOpen(true)}>
                      <Plus size={16} />
                      Agregar campo
                    </DropdownMenuItem>
                  ) : null}

                  {user.capabilities.canManageBilling ? (
                    <>
                      <DropdownMenuItem disabled>
                        <DollarSign size={16} />
                        Suscribirse
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        <DollarSign size={16} />
                        Mis pagos
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      void signOutAction();
                    }}
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <CreateTenantDialog open={createFieldOpen} onClose={() => setCreateFieldOpen(false)} />
    </div>
  );
}
