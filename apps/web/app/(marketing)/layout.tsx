import { Analytics } from "@vercel/analytics/next";

/** Visitas a la landing con Vercel Web Analytics: sin cookies, así que no hace
 *  falta cartel de consentimiento. Solo mide en Vercel, con Analytics prendido. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
