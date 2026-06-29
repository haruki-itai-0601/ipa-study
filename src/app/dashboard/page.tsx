import { redirect } from "next/navigation";

// ダッシュボードはホーム（/）に統合。旧 /dashboard ブックマークは / へ転送。
export default function DashboardRedirect() {
  redirect("/");
}
