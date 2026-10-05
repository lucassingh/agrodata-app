import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Solo producción se indexa; el dashboard y la API nunca. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
