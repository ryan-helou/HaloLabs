import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / user-scoped surfaces — nothing for a crawler to index.
      disallow: ["/api/", "/person/", "/profiles", "/start", "/login", "/signup"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
