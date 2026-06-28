// X のサービスPR投稿に添付するブランド画像(PNG)を生成する。
// @napi-rs/canvas + バンドルした NotoSansJP を使用。renderPrCard({title, sub}) で Buffer を返す。
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");

const W = 1200, H = 675; // X タイムライン表示に最適な 16:9
const DOMAIN = "kakomon-labo.com"; // ドメイン移行後は kakomon-labo.com に変更

// title は "\n" で改行可。各行を大きく描画する。
export function renderPrCard({ title, sub }) {
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
  x.beginPath(); x.arc(W - 130, 110, 230, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(150, H - 40, 190, 0, Math.PI * 2); x.fill();

  const PAD = 84;

  // ブランド名（上）
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.font = "bold 34px NotoJP";
  x.fillText("過去問演習ラボ", PAD, 92);
  x.font = "26px NotoJP";
  x.fillStyle = "rgba(255,255,255,0.78)";
  x.fillText("ITパスポート・基本情報・応用情報", PAD, 132);

  // 見出し（大・複数行）
  const lines = String(title).split("\n");
  const titleSize = lines.length >= 3 ? 78 : 96;
  x.fillStyle = "#ffffff";
  x.font = `bold ${titleSize}px NotoJP`;
  let cy = H / 2 - ((lines.length - 1) * (titleSize + 14)) / 2 - 10;
  for (const ln of lines) {
    x.fillText(ln, PAD, cy);
    cy += titleSize + 14;
  }

  // サブ
  if (sub) {
    x.fillStyle = "rgba(255,255,255,0.92)";
    x.font = "36px NotoJP";
    x.fillText(sub, PAD, cy + 18);
  }

  // フッター（ドメイン＋無料バッジ）
  x.fillStyle = "rgba(255,255,255,0.9)";
  x.font = "bold 30px NotoJP";
  x.fillText(DOMAIN, PAD, H - 56);

  const badge = "過去問演習は無料";
  x.font = "bold 28px NotoJP";
  const bw = x.measureText(badge).width + 52;
  const bx = W - PAD - bw;
  const by = H - 92;
  x.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(x, bx, by, bw, 52, 26); x.fill();
  x.fillStyle = "#ffffff";
  x.fillText(badge, bx + 26, by + 36);

  return c.toBuffer("image/png");
}

function roundRect(ctx, x0, y0, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  ctx.arcTo(x0, y0 + h, x0, y0, r);
  ctx.arcTo(x0, y0, x0 + w, y0, r);
  ctx.closePath();
}
