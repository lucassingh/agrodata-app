"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CampiaLogo } from "@/components/brand/campia-logo";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Database,
  Lock,
  DollarSign,
  TrendingUp,
  Milk,
  Scale,
  Download,
  Fence,
  LifeBuoy,
  LogOut,
  Map as MapIcon,
  Menu,
  X,
  Package,
  PieChart,
  Plus,
  Briefcase,
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
import { useIsDesktop, useSidebar } from "@/context/sidebar-context";
import { CreateTenantDialog } from "@/components/create-tenant-dialog";
import { setActiveTenantAction } from "@/app/dashboard/(app)/_lib/tenant-actions";
import { cn } from "@/lib/utils";
import { TourHost, TourLayer } from "@/components/product-tour/engine";
import type { Capabilities, PlatformRole } from "@repo/core";
import { visibleModules } from "@repo/core/tenants/tenant-labels";
import { isWebRole } from "@repo/core/auth/field-roles";

/** Rol en el campo activo. */
const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  OWNER: "Dueño",
  FARM_MANAGER: "Encargado",
  ADVISOR: "Asesor",
  OPERATOR: "Operario",
};

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface AppShellUser {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  capabilities: Capabilities;
  activeTenantId: string | null;
  /** Equipo de Campia (SUPER_ADMIN_EMAILS): ve el panel de soporte. */
  isStaff: boolean;
}

interface Membership {
  tenantId: string;
  role: string;
  tenant: { id: string; name: string; category: string; activities: string[] };
}

interface AppShellProps {
  user: AppShellUser;
  memberships: Membership[];
  children: ReactNode;
  signOutAction: () => Promise<void>;
  /** Entorno que no es producción («Prueba», «Local»), para no confundirlos. */
  environmentLabel: string | null;
  /** El campo activo está en modo lectura (venció la prueba o el plan). */
  readOnly: boolean;
  /** Días que le quedan a mi prueba gratis (null si no estoy en prueba). */
  trialDaysLeft: number | null;
  /** Guías que la persona ya terminó o cerró (tour guiado). */
  seenTours: string[];
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

export function AppShell({
  user,
  memberships,
  children,
  signOutAction,
  environmentLabel,
  readOnly,
  trialDaysLeft,
  seenTours,
}: AppShellProps) {
  const { collapsed: collapsedSetting, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const isDesktop = useIsDesktop();
  // En celular el menú va siempre completo: se abre encima del contenido.
  const collapsed = collapsedSetting && isDesktop;
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

  // El menú de celular se cierra al navegar y con Escape.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  const modules = visibleModules(memberships.find((m) => m.tenantId === user.activeTenantId)?.tenant.activities ?? []);
  // Los campos donde solo soy operario se usan por WhatsApp: no se eligen en la web.
  const webMemberships = memberships.filter((m) => isWebRole(m.role));
  const campoItems: NavItem[] = [
    // Con dos o más campos, la cartera los compara (modo asesor).
    ...(webMemberships.length > 1
      ? [{ label: "Cartera", href: "/dashboard/portfolio", icon: <Briefcase size={18} /> }]
      : []),
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
    // Los módulos de cada actividad, solo si el campo la tiene (el tambo incluye Ganadería).
    ...(modules.economy ? [{ label: "Economía", href: "/dashboard/economy", icon: <TrendingUp size={18} /> }] : []),
    ...(modules.livestock ? [{ label: "Ganadería", href: "/dashboard/livestock", icon: <Scale size={18} /> }] : []),
    ...(modules.dairy ? [{ label: "Tambo", href: "/dashboard/dairy", icon: <Milk size={18} /> }] : []),
    { label: "Insumos", href: "/dashboard/supplies", icon: <Package size={18} /> },
  ];
  const configItems: NavItem[] = [
    { label: "Equipo", href: "/dashboard/team", icon: <Users size={18} /> },
    { label: "Preferencias", href: "/dashboard/preferences", icon: <Settings size={18} /> },
    { label: "Mi plan", href: "/dashboard/plan", icon: <CreditCard size={18} /> },
  ];
  const staffItems: NavItem[] = [{ label: "Soporte", href: "/dashboard/support", icon: <LifeBuoy size={18} /> }];

  const activeMembership = memberships.find((m) => m.tenantId === user.activeTenantId);
  const activeTenant = activeMembership?.tenant;
  const canSwitchActiveTenant = webMemberships.length > 1;

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === user.activeTenantId) return;
    await setActiveTenantAction(tenantId);
    router.refresh();
  };

  function renderNavSection(title: string, items: NavItem[], tourKey: string) {
    return (
      <div className="mb-1" data-tour={`shell.menu.${tourKey}`}>
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
              data-tour={`shell.menu.item.${item.href.split("/").pop()}`}
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
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        id="app-sidebar"
        aria-label="Menú principal"
        className={cn(
          // Celular: cajón que entra desde la izquierda. Escritorio: columna, angosta o completa.
          "fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r border-border bg-sidebar transition-transform duration-200 md:static md:translate-x-0 md:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "md:w-[86px]",
        )}
      >
        <div className={cn("flex h-16 items-center justify-between px-4", collapsed && "justify-center px-2")}>
          {collapsed ? (
            <CampiaLogo variant="mark" className="text-primary text-[34px]" />
          ) : (
            <CampiaLogo className="text-primary text-[23px]" />
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
            <X size={18} />
          </Button>
        </div>

        {activeTenant ? (
          <div data-tour="shell.field" className={cn("px-3 py-2", collapsed && "flex justify-center px-0")}>
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
          {renderNavSection("Campo", campoItems, "campo")}
          {!collapsed ? <div className="mx-3 my-1 border-t border-border" /> : null}
          {renderNavSection("Gestión", gestionItems, "gestion")}
          {!collapsed ? <div className="mx-3 my-1 border-t border-border" /> : null}
          {renderNavSection("Configuración", configItems, "configuracion")}
          {user.isStaff ? (
            <>
              {!collapsed ? <div className="mx-3 my-1 border-t border-border" /> : null}
              {renderNavSection("Campia", staffItems, "agrodata")}
            </>
          ) : null}
        </nav>
      </aside>

      {/* min-w-0: sin esto, una tabla ancha estira la columna y toda la página se desborda. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-4">
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
          >
            <Menu size={18} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>

          {environmentLabel ? (
            <span className="truncate rounded-full border border-[#D97706]/40 bg-[#FDF4E3] px-2.5 py-1 text-[11px] font-semibold text-[#8A5A12] sm:px-3 sm:text-xs">
              Entorno: {environmentLabel}
            </span>
          ) : null}

          {trialDaysLeft !== null ? (
            <Link
              href="/dashboard/plan"
              data-tour="shell.header.trial"
              className="hidden truncate rounded-full border border-primary/30 bg-accent px-3 py-1 text-xs font-semibold text-primary-dark hover:bg-muted sm:inline-block"
            >
              Prueba gratis: {trialDaysLeft === 1 ? "queda 1 día" : `quedan ${trialDaysLeft} días`}
            </Link>
          ) : null}

          <div className="flex items-center gap-1">
            <TourHost multiField={webMemberships.length > 1} />
            <a
              href="https://wa.me/5491100000000"
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp de soporte"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <Image src="/brand/whatsapp.svg" alt="" width={20} height={20} />
            </a>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" title="Descargar reporte">
              <Download size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              title="Nueva tarea"
              onClick={() => router.push("/dashboard/tasks")}
            >
              <ClipboardList size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              title="Nuevo dato"
              onClick={() => router.push("/dashboard/data")}
            >
              <Plus size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              title="Configuración del campo"
              onClick={() => router.push("/dashboard/preferences")}
            >
              <Settings size={18} />
            </Button>

            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger data-tour="shell.header.user" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
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
                    webMemberships.map((m) => {
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

                  <DropdownMenuItem onClick={() => router.push("/dashboard/plan")}>
                    <CreditCard size={16} />
                    Mi plan
                  </DropdownMenuItem>
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

        {/* Franja fija bajo el encabezado (no dentro del contenido): el banner de cada página se pega arriba. */}
        {readOnly ? (
          <div
            role="status"
            className="flex flex-col gap-3 border-b border-[#D97706]/40 bg-[#FDF4E3] px-4 py-3 text-[#6B4510] sm:flex-row sm:items-center md:px-6"
          >
            <Lock size={18} className="hidden shrink-0 sm:block" aria-hidden />
            <p className="flex-1 text-sm">
              <strong className="font-bold">Este campo está en modo lectura.</strong> Venció la prueba gratis o el plan
              de quien lo administra. Podés ver, exportar y pedir informes, y no se pierde ningún dato. Para volver a
              cargar, activá un plan.
            </p>
            <Link href="/dashboard/plan" className={cn(buttonVariants({ size: "sm" }), "shrink-0 self-start sm:self-auto")}>
              Ver planes
            </Link>
          </div>
        ) : null}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <CreateTenantDialog open={createFieldOpen} onClose={() => setCreateFieldOpen(false)} />
      <TourLayer userId={user.id} seenTours={seenTours} />
    </div>
  );
}
