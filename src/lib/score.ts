// 合格可能性スコア（ダッシュボードとモバイルホームで共有）
// 式: 正答率 ×（0.7 ＋ 0.3 × 網羅率）／網羅率 = 累計演習数 ÷ 目安問題数（上限100%）

export const EXAM_TARGET: Record<string, number> = { ip: 600, fe: 600, ap: 800 };
export const PASS_LINE = 65;

export function passScore(acc: number, solved: number, target: number) {
  if (solved === 0) return 0;
  const cov = Math.min(1, solved / target);
  return Math.round(Math.min(100, acc * (0.7 + 0.3 * cov)));
}

// 判定バッジ。65以上は一律「合格圏」、65未満は要対策/あと少し、未演習は未測定。
export function scoreBand(score: number, solved: number): { label: string; bg: string; fg: string } {
  if (solved === 0) return { label: "未測定", bg: "#EDF1F6", fg: "#8FA0B5" };
  if (score >= PASS_LINE) return { label: "合格圏", bg: "#E3F4EC", fg: "#0F8A5F" };
  if (score >= 40) return { label: "あと少し", bg: "#FBEADF", fg: "#C2410C" };
  return { label: "要対策", bg: "#FBE9E9", fg: "#DC2626" };
}
