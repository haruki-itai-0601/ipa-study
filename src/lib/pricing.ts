// プレミアム会員の料金（円・税込）。ここを唯一の出所（single source of truth）にして、
// 表示（クライアント）と決済（サーバーの Checkout price_data）で必ず同じ額を参照させる。
// ※秘密情報を含まないクライアント安全なモジュール（stripe.ts は server-only のため分離）。
export const PREMIUM_PRICE_JPY = 300; // 月額
export const PREMIUM_PRICE_YEARLY_JPY = 3000; // 年額（実質250円/月・2ヶ月分お得）
export const PREMIUM_PRODUCT_NAME = "過去問演習ラボ プレミアム会員";

// 年額の「月あたり」表示用（3000 / 12 = 250）
export const PREMIUM_YEARLY_PER_MONTH_JPY = Math.round(PREMIUM_PRICE_YEARLY_JPY / 12);
