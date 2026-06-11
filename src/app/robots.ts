import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 管理画面・API・認証コールバック・個人の学習分析はクロール不要
        disallow: ["/admin", "/api/", "/auth/", "/analysis"],
      },
    ],
    sitemap: "https://kakomon-dojo.com/sitemap.xml",
  };
}
