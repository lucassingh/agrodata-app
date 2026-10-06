import { ClerkProvider } from "@clerk/nextjs";
import { esUY } from "@clerk/localizations";

/** Los textos de Clerk dicen el nombre de la app tal como figura en Clerk («campia»); acá va la
 *  marca escrita como corresponde, sin depender del panel de Clerk. */
function withAppName<T>(value: T, name: string): T {
  if (typeof value === "string") return value.replaceAll("{{applicationName}}", name) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, withAppName(inner, name)])) as T;
  }
  return value;
}

const localization = withAppName(esUY, "campIA");

/** Clerk (el login) solo en el dashboard: la landing no carga su JavaScript.
 *  `esUY` es la traducción de Clerk con voseo, como el resto de campIA. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={localization}
      signInUrl="/dashboard/sign-in"
      signUpUrl="/dashboard/register"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/dashboard/sign-in"
      appearance={{
        variables: {
          colorPrimary: "#2d6a4f",
          colorForeground: "#1a1d21",
          colorMutedForeground: "#5f6368",
          colorDanger: "#c4453a",
          colorBackground: "#ffffff",
          // Más oscuro que el borde de la app: Clerk lo aclara y los campos casi no se veían.
          colorBorder: "#b8bec6",
          fontFamily: "var(--font-sans)",
          borderRadius: "0.625rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
