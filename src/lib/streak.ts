// 連続学習日数の計算（ダッシュボードと同じロジックをモバイルホーム/今日の5問と共有）

// get_answered_days_jst は RETURNS TABLE(day date) ＝ [{day:"YYYY-MM-DD"}] を返す。
// 文字列配列と誤解しやすいので、ここで正規化して受ける。
import { getExam } from "./exams";
export function toDayStrings(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => (typeof r === "string" ? r : r && typeof r === "object" && "day" in r ? String((r as { day: unknown }).day) : ""))
    .filter(Boolean);
}

const DAY_MS = 86400000;

// 任意の時刻をJSTの暦日(YYYY-MM-DD)に変換する。実行環境のタイムゾーンに依存しないよう
// エポック(getTime)にJSTオフセット(+9h)を足してUTC表記の日付部分を取り出す。
// ※以前はブラウザのローカル時刻(getFullYear等)で計算しており、サーバーのJST集計
//   (get_answered_days_jst)とズレて深夜帯や国外ユーザーで連続日数が誤って0になっていた。
export function fmtDateJst(dt: Date) {
  return new Date(dt.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function calcStreak(days: string[]): number {
  if (!days?.length) return 0;
  const set = new Set(days);
  let cur = new Date();
  if (!set.has(fmtDateJst(cur))) cur = new Date(cur.getTime() - DAY_MS);
  let s = 0;
  while (set.has(fmtDateJst(cur))) {
    s++;
    cur = new Date(cur.getTime() - DAY_MS);
  }
  return s;
}

// 今週（今日を含む直近7日）に学習した日数。JST基準・エポック減算でTZ非依存。
export function thisWeekDays(days: string[]): number {
  if (!days?.length) return 0;
  const set = new Set(days);
  let n = 0;
  let cur = new Date();
  for (let i = 0; i < 7; i++) {
    if (set.has(fmtDateJst(cur))) n++;
    cur = new Date(cur.getTime() - DAY_MS);
  }
  return n;
}

// 試験日（全試験共通・ダッシュボードで設定。examDatesにどれか1つでも入っていれば共通値として返す）
export function getExamDate(): string | null {
  try {
    const j = JSON.parse(localStorage.getItem("examDates") ?? "{}") as Record<string, string>;
    return Object.values(j).find(Boolean) ?? null;
  } catch {
    return null;
  }
}

// 試験日までの残り日数。試験日と「今のJST暦日」をどちらもUTC正午で数値化して引くことで
// 実行環境のTZに依存させない（fmtDateJst＝streak/quotaと同じJST基準に統一）。
// 以前は new Date(dateStr+"T00:00:00") がブラウザのローカルTZでパースされ、Date.now()との
// 組み合わせで非JST端末・深夜帯にカウントダウンが±1ズレていた。
export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const toUtcNoon = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d, 12);
  };
  const diff = Math.round((toUtcNoon(dateStr) - toUtcNoon(fmtDateJst(new Date()))) / 86400000);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

// モバイルで選択中の試験（ダッシュボードのタブと共有）
export function getActiveExam(): string {
  try {
    const v = localStorage.getItem("labActiveExam");
    // 定義済みの試験ならすべて許可（2027新試験・支援士・高度区分を含む）
    if (v && getExam(v)) return v;
  } catch {}
  return "ip";
}

export function setActiveExamStorage(id: string) {
  try {
    localStorage.setItem("labActiveExam", id);
  } catch {}
}
