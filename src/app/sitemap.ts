import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/how-it-works", "/packages", "/compensation-plan", "/faq", "/contact", "/terms", "/privacy"];
  return routes.map((r) => ({
    url: `${siteConfig.url}${r}`,
    lastModified: new Date(),
    changeFrequency: r === "/" ? "weekly" : "monthly",
    priority: r === "/" ? 1 : 0.7,
  }));
}
