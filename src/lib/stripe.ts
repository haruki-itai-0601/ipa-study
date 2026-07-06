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

// プレミアム会員の月額（円・税込）。Checkout の price_data と表示の両方で使う
export const PREMIUM_PRICE_JPY = 980;
export const PREMIUM_PRODUCT_NAME = "過去問演習ラボ プレミアム会員";
