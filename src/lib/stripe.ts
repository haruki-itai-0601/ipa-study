import "server-only"; // STRIPE_SECRET_KEY を扱うため、クライアントからの誤importをビルド時に禁止する
import Stripe from "stripe";

// STRIPE_SECRET_KEY 未設定の環境（キー設定前のビルド等）でも落ちないよう遅延初期化
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

// 価格定数は client 安全な @/lib/pricing に移動（このモジュールは server-only のため）。
