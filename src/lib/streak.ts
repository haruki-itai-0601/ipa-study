// 連続学習日数の計算（ダッシュボードと同じロジックをモバイルホーム/今日の5問と共有）

// get_answered_days_jst は RETURNS TABLE(day date) ＝ [{day:"YYYY-MM-DD"}] を返す。
// 文字列配列と誤解しやすいので、ここで正規化して受ける。
export function toDayStrings(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => (typeof r === "string" ? r : r && typeof r === "object" && "day" in r ? String((r as { day: unknown }).day) : ""))
    .filter(Boolean);
}

export function fmtDateJst(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function calcStreak(days: string[]): number {
  if (!days?.length) return 0;
  const set = new Set(days);
  const cur = new Date();
  if (!set.has(fmtDateJst(cur))) cur.setDate(cur.getDate() - 1);
  let s = 0;
  while (set.has(fmtDateJst(cur))) {
    s++;
    cur.setDate(cur.getDate() - 1);
  }
  return s;
}

// モバイルで選択中の試験（ダッシュボードのタブと共有）
export function getActiveExam(): string {
  try {
    const v = localStorage.getItem("labActiveExam");
    if (v === "ip" || v === "fe" || v === "ap") return v;
  } catch {}
  return "ip";
}

export function setActiveExamStorage(id: string) {
  try {
    localStorage.setItem("labActiveExam", id);
  } catch {}
}
