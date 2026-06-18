// 「今日の1問」カード画像(PNG)を生成する。@napi-rs/canvas + バンドルした Noto Sans JP を使用。
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");

const W = 1200, H = 675;
const KANA = { a: "ア", b: "イ", c: "ウ", d: "エ" };

// 行頭に置きたくない文字（禁則）。これらは前の行末にぶら下げる
const NO_LINE_START = "。、，．）」』】〕｝、。";
function wrap(ctx, text, maxW) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") { lines.push(line); line = ""; continue; }
    const t = line + ch;
    if (ctx.measureText(t).width > maxW && line) {
      // 禁則文字なら改行せず行末にぶら下げる
      if (NO_LINE_START.includes(ch)) { line = t; }
      else { lines.push(line); line = ch; }
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export function renderCard(q, em, opts = {}) {
  const title = opts.title || "今日の1問";
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
  x.fillText(title, 56, 74);
  x.font = "26px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.85)";
  x.fillText(`${em.name}／${q.year}`, 56, 112);
  x.textAlign = "right";
  x.font = "bold 30px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.fillText("過去問演習ラボ", W - 56, 74);
  x.textAlign = "left";

  // 白パネル
  const px = 48, py = 140, pw = W - 96, ph = H - 140 - 70;
  x.fillStyle = "#ffffff";
  roundRect(x, px, py, pw, ph, 28);
  x.fill();

  const innerW = pw - 80;
  let cy = py + 38; // 白パネル上部の余白を詰める

  // 問題文（長さに応じてフォント自動調整。短い問題は大きく見せる）
  let qSize = 44;
  let qLines;
  for (; qSize >= 30; qSize -= 2) {
    x.font = `bold ${qSize}px NotoJP`;
    qLines = wrap(x, q.question, innerW);
    if (qLines.length * (qSize + 12) <= ph * 0.46) break;
  }
  x.fillStyle = "#0f172a";
  x.font = `bold ${qSize}px NotoJP`;
  for (const ln of qLines) { x.fillText(ln, px + 40, cy + qSize); cy += qSize + 12; }
  cy += 14;

  // 選択肢（読みやすさ優先：濃い色＋太字）。残りの高さに収まるようサイズを自動調整してはみ出し防止
  const bottom = py + ph - 24; // 白パネル下端の手前まで
  const optGap = 20; // 選択肢ごとの間隔（少し広め）
  let oSize = 40;
  let oLines; // [{label, lines}]
  for (; oSize >= 20; oSize -= 1) {
    x.font = `bold ${oSize}px NotoJP`;
    oLines = ["a", "b", "c", "d"].map((k) => ({
      label: KANA[k],
      lines: wrap(x, q[`option_${k}`], innerW - 56),
    }));
    const lineH = oSize + 11;
    const total = oLines.reduce((s, o) => s + o.lines.length * lineH + optGap, 0);
    if (cy + total <= bottom) break;
  }
  const lineH = oSize + 11;
  for (const o of oLines) {
    x.fillStyle = "#4338ca";
    x.font = `bold ${oSize}px NotoJP`;
    x.fillText(o.label, px + 40, cy + oSize);
    x.fillStyle = "#0f172a";
    x.font = `bold ${oSize}px NotoJP`;
    for (const ln of o.lines) {
      x.fillText(ln, px + 40 + 50, cy + oSize);
      cy += lineH;
    }
    cy += optGap;
  }

  // フッター
  x.fillStyle = "rgba(255,255,255,0.9)";
  x.font = "24px NotoJP";
  x.fillText("kakomon-dojo.com", 56, H - 30);
  x.textAlign = "right";
  x.fillStyle = "rgba(255,255,255,0.75)";
  x.font = "20px NotoJP";
  x.fillText("出典：IPA 情報処理技術者試験", W - 56, H - 30);
  x.textAlign = "left";

  return c.toBuffer("image/png");
}

// 「5問チャレンジ」告知バナー
export function renderChallengeCard(em) {
  const c = createCanvas(W, H);
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#f59e0b");
  g.addColorStop(1, "#b45309");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  x.textAlign = "center";
  x.fillStyle = "rgba(255,255,255,0.95)";
  x.font = "bold 40px NotoJP";
  x.fillText("週末の腕試し", W / 2, 130);
  x.font = "bold 120px NotoJP";
  x.fillText("5問チャレンジ", W / 2, 290);
  x.font = "bold 48px NotoJP";
  x.fillText(em.name, W / 2, 400);
  x.font = "40px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.95)";
  x.fillText("あなたは何問解ける？", W / 2, 480);
  x.font = "30px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.85)";
  x.fillText("1分でできる・結果はその場で答え合わせ", W / 2, 540);

  x.font = "bold 30px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.95)";
  x.fillText("過去問演習ラボ", W / 2, H - 50);
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
