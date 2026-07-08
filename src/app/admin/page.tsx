import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminToken } from "@/lib/admin-token";
import AdminClient from "./admin-client";

// 管理ダッシュボードのサーバー側認可ゲート（proxy に加えた二重チェック）。
// proxy.ts は「optimistic な入口ガード」に過ぎない（フォーク公式ドキュメントも
// Proxy を唯一の認可解にするなと明記）ため、実データを描画するこのページでも
// サーバーコンポーネントとして admin_token を再検証し、無効なら /admin/login へ送る。
export default async function AdminPage() {
  const token = (await cookies()).get("admin_token")?.value;
  const ok = await verifyAdminToken(token, process.env.ADMIN_SECRET ?? "");
  if (!ok) redirect("/admin/login?from=/admin");
  return <AdminClient />;
}
