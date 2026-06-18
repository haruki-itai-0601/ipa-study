// OGP画像 public/og.png を生成する。@napi-rs/canvas + バンドルした NotoSansJP を使用。
// 実行: node scripts/og-card.mjs
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");

const W = 1200, H = 630;
const DOMAIN = "kakomon-dojo.com"; // ドメイン移行後は kakomon-lab.com に変更して再生成

const c = createCanvas(W, H);
const x = c.getContext("2d");

// 背景グラデ（サイトのヒーローと同じインディゴ→バイオレット）
const g = x.createLinearGradient(0, 0, W, H);
g.addColorStop(0, "#4f46e5");
g.addColorStop(1, "#7c3aed");
x.fillStyle = g;
x.fillRect(0, 0, W, H);

// 装飾の淡い円
x.fillStyle = "rgba(255,255,255,0.08)";
x.beginPath(); x.arc(W - 120, 90, 220, 0, Math.PI * 2); x.fill();
x.beginPath(); x.arc(150, H - 50, 180, 0, Math.PI * 2); x.fill();

const PAD = 80;

// 上部キッカー（タグライン）
x.fillStyle = "rgba(255,255,255,0.92)";
x.font = "bold 34px NotoJP";
x.fillText("AIエージェントと、合格へ最短で。", PAD, 152);

// ブランド名（大）
x.fillStyle = "#ffffff";
x.font = "bold 96px NotoJP";
x.fillText("過去問演習ラボ", PAD, 272);

// サブ
x.fillStyle = "rgba(255,255,255,0.85)";
x.font = "33px NotoJP";
x.fillText("ITパスポート・基本情報・応用情報　過去問演習", PAD, 338);

// バリュー・チップ
const chips = ["過去問演習は無料", "AIが弱点を分析", "午後記述をAI採点"];
let cx = PAD;
const cy = 408, chh = 64;
x.font = "bold 30px NotoJP";
for (const t of chips) {
  const cw = x.measureText(t).width + 56;
  x.fillStyle = "rgba(255,255,255,0.16)";
  roundRect(x, cx, cy, cw, chh, 32); x.fill();
  x.fillStyle = "#ffffff";
  x.fillText(t, cx + 28, cy + 43);
  cx += cw + 20;
}

// フッター（ドメイン）
x.fillStyle = "rgba(255,255,255,0.9)";
x.font = "bold 30px NotoJP";
x.fillText(DOMAIN, PAD, H - 54);

writeFileSync(join(__dirname, "..", "public", "og.png"), c.toBuffer("image/png"));
console.log("public/og.png を生成しました（" + W + "x" + H + "）");

function roundRect(ctx, x0, y0, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  ctx.arcTo(x0, y0 + h, x0, y0, r);
  ctx.arcTo(x0, y0, x0 + w, y0, r);
  ctx.closePath();
}
