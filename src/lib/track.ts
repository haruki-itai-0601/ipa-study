// GA4 イベント送信のヘルパー。gtag が無い環境（SSR・未ロード）では何もしない。
// 送信したイベントは GA4 の「管理 → イベント」に現れるので、課金につながるもの
// （begin_checkout など）を「キーイベント」に切り替えるとファネルが可視化できる。
type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params?: Params): void {
  if (typeof window === "undefined") return;
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === "function") g("event", event, params ?? {});
}
