// 「今日の1問」カード画像(PNG)を生成する。@napi-rs/canvas + バンドルした Noto Sans JP を使用。
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");

const W = 1200, H = 675;
const KANA = { a: "ア", b: "イ", c: "ウ", d: "エ" };

function wrap(ctx, text, maxW) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") { lines.push(line); line = ""; continue; }
    const t = line + ch;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = ch; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export function renderCard(q, em) {
  const c = createCanvas(W, H);
  const x = c.getContext("2d");

  // 背景グラデ（ブランドのインディゴ）
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#6366f1");
  g.addColorStop(1, "#4338ca");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // ヘッダー
  x.fillStyle = "rgba(255,255,255,0.95)";
  x.font = "bold 36px NotoJP";
  x.fillText("今日の1問", 56, 74);
  x.font = "26px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.85)";
  x.fillText(`${em.name}／${q.year}`, 56, 112);
  x.textAlign = "right";
  x.font = "bold 30px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.fillText("過去問道場", W - 56, 74);
  x.textAlign = "left";

  // 白パネル
  const px = 48, py = 140, pw = W - 96, ph = H - 140 - 70;
  x.fillStyle = "#ffffff";
  roundRect(x, px, py, pw, ph, 28);
  x.fill();

  const innerW = pw - 80;
  let cy = py + 56;

  // 問題文（長さに応じてフォント自動調整）
  let qSize = 38;
  let qLines;
  for (; qSize >= 26; qSize -= 2) {
    x.font = `bold ${qSize}px NotoJP`;
    qLines = wrap(x, q.question, innerW);
    if (qLines.length * (qSize + 12) <= ph * 0.42) break;
  }
  x.fillStyle = "#0f172a";
  x.font = `bold ${qSize}px NotoJP`;
  for (const ln of qLines) { x.fillText(ln, px + 40, cy + qSize); cy += qSize + 12; }
  cy += 14;

  // 選択肢
  const oSize = 27;
  x.font = `${oSize}px NotoJP`;
  for (const k of ["a", "b", "c", "d"]) {
    const label = KANA[k];
    const lines = wrap(x, q[`option_${k}`], innerW - 56);
    x.fillStyle = "#4f46e5";
    x.font = `bold ${oSize}px NotoJP`;
    x.fillText(label, px + 40, cy + oSize);
    x.fillStyle = "#1f2937";
    x.font = `${oSize}px NotoJP`;
    let first = true;
    for (const ln of lines) {
      x.fillText(ln, px + 40 + 48, cy + oSize);
      cy += oSize + 8;
      first = false;
    }
    cy += 6;
  }

  // フッター
  x.fillStyle = "rgba(255,255,255,0.9)";
  x.font = "24px NotoJP";
  x.fillText("20260524ipa-study.vercel.app", 56, H - 30);
  x.textAlign = "right";
  x.fillStyle = "rgba(255,255,255,0.75)";
  x.font = "20px NotoJP";
  x.fillText("出典：IPA 情報処理技術者試験", W - 56, H - 30);
  x.textAlign = "left";

  return c.toBuffer("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
