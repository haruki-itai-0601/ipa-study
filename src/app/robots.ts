import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 管理画面・API・認証コールバック・ログイン/会員登録・個人データ画面はクロール不要
        disallow: ["/admin", "/api/", "/auth/", "/account", "/stats", "/device-preview.html"],
      },
    ],
    sitemap: "https://kakomon-labo.com/sitemap.xml",
  };
}
