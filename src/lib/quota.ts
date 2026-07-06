// 「今日の5問」の1日あたり実行回数の上限（クライアント側ソフトゲート）。
// 未ログイン=3回／無料会員=10回／有料(Pro)=無制限。JSTの暦日でリセット。
// ※出題は無料の過去問プールなので、上限は「登録・課金への案内」を目的としたソフトな仕組み。

import { fmtDateJst } from "./streak";

export type Tier = "guest" | "free" | "pro";

export const TODAY_LIMIT: Record<Tier, number> = { guest: 3, free: 10, pro: Infinity };

function quotaKey(): string {
  return `todayQuota:${fmtDateJst(new Date())}`;
}

export function getTodayCount(): number {
  try {
    return parseInt(localStorage.getItem(quotaKey()) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function incTodayCount(): void {
  try {
    localStorage.setItem(quotaKey(), String(getTodayCount() + 1));
  } catch {}
}

export function remainingToday(tier: Tier): number {
  const lim = TODAY_LIMIT[tier];
  if (!isFinite(lim)) return Infinity;
  return Math.max(0, lim - getTodayCount());
}
