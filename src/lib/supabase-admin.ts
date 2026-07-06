import "server-only"; // service_role キーを扱うため、クライアントからの誤importをビルド時に禁止する
import { createClient } from "@supabase/supabase-js";

// service_role キーで RLS をバイパスする管理用クライアント。
// Stripe Webhook などサーバー専用処理でのみ使用し、クライアントへ公開しないこと。
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
