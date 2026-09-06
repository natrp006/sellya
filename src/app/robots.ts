import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/dashboard", "/listings/new", "/sign-in"],
    },
    sitemap: "https://sellya.info/sitemap.xml",
  };
}
