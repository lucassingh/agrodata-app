import { ClerkProvider } from "@clerk/nextjs";
import { esUY } from "@clerk/localizations";

/** Clerk (el login) solo en el dashboard: la landing no carga su JavaScript.
 *  `esUY` es la traducción de Clerk con voseo, como el resto de campIA. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={esUY}
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
