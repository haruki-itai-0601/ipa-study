// 「1枚で5つの機能がわかる」機能まとめ画像を生成する。
// 各機能の実スクショをサムネにして、番号バッジ＋ラベルで並べる（App Storeの機能紹介風）。
// 出力: marketing/x/features.png（1600×900・2倍解像度）
// 実行: node scripts/x-features.mjs
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");
const OUT = join(__dirname, "..", "marketing", "x");

const NAVY0 = "#081A38", NAVY1 = "#0E2A50", BRAND = "#1D4ED8", INK = "#15202E", MUTED = "#5A6B85";

function rr(x, px, py, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

const W = 1600, H = 900, SS = 2;
const c = createCanvas(W * SS, H * SS);
const x = c.getContext("2d");
x.scale(SS, SS);

// 背景
const g = x.createLinearGradient(0, 0, W, H);
g.addColorStop(0, NAVY0); g.addColorStop(1, NAVY1);
x.fillStyle = g; x.fillRect(0, 0, W, H);
const rg = x.createRadialGradient(W * 0.5, 0, 60, W * 0.5, 0, 900);
rg.addColorStop(0, "rgba(80,120,200,0.16)"); rg.addColorStop(1, "rgba(80,120,200,0)");
x.fillStyle = rg; x.fillRect(0, 0, W, H);

// 見出し
x.textAlign = "left";
x.fillStyle = "#FFFFFF"; x.font = "bold 52px NotoJP";
x.fillText("無料で、ここまでできる。", 60, 108);
x.fillStyle = "#AFC6F0"; x.font = "bold 26px NotoJP";
x.fillText("ITパスポート・基本情報の対策を、AIとワンストップで。", 62, 152);

// 機能カード（実スクショのサムネ＋番号＋ラベル）
const feats = [
  { img: "shot-diagnosis.png", crop: [0, 150, 1170, 1180], t1: "AI合格診断", t2: "3分で弱点をズバリ" },
  { img: "shot-mobile.png", crop: [0, 300, 1170, 1180], t1: "今日の5問", t2: "弱点だけ集中補強" },
  { img: "shot-path.png", crop: [0, 620, 1170, 1180], t1: "ステップ学習", t2: "学んで→その場で過去問" },
  { img: "shot-desktop.png", crop: [1980, 820, 1000, 1010], t1: "弱点分析", t2: "分野別・レーダーで一目" },
  { img: "shot-figure.png", crop: [40, 560, 1090, 1090], t1: "図つき解説", t2: "図表問題も図つきで" },
];

const n = feats.length, gap = 22, cardW = (W - 60 * 2 - gap * (n - 1)) / n;
const cardH = 560, cardY = 220, thumbH = 384;

for (let i = 0; i < n; i++) {
  const f = feats[i];
  const cx = 60 + i * (cardW + gap);
  // カード影＋本体
  x.fillStyle = "rgba(0,0,0,0.28)"; rr(x, cx + 4, cardY + 8, cardW, cardH, 18); x.fill();
  x.fillStyle = "#FFFFFF"; rr(x, cx, cardY, cardW, cardH, 18); x.fill();
  // サムネ（上部・角丸クリップ・cover-fit）
  const img = await loadImage(join(OUT, f.img));
  x.save();
  rr(x, cx, cardY, cardW, thumbH, 18);
  // 下側は角丸なしにしたいので下辺を直線で覆う
  x.rect(cx, cardY + thumbH - 20, cardW, 20);
  x.clip();
  const [sx, sy, sw, sh] = f.crop;
  const scale = Math.max(cardW / sw, thumbH / sh);
  const dw = sw * scale, dh = sh * scale;
  x.drawImage(img, sx, sy, sw, sh, cx + (cardW - dw) / 2, cardY + (thumbH - dh) / 2, dw, dh);
  x.restore();
  // サムネ下の区切り線
  x.strokeStyle = "#EEF1F6"; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, cardY + thumbH); x.lineTo(cx + cardW, cardY + thumbH); x.stroke();
  // 番号バッジ
  x.fillStyle = BRAND; x.beginPath(); x.arc(cx + 30, cardY + thumbH + 34, 17, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#FFFFFF"; x.font = "bold 18px NotoJP"; x.textAlign = "center";
  x.fillText(String(i + 1), cx + 30, cardY + thumbH + 40); x.textAlign = "left";
  // ラベル
  x.fillStyle = INK; x.font = "bold 22px NotoJP";
  x.fillText(f.t1, cx + 56, cardY + thumbH + 42);
  x.fillStyle = MUTED; x.font = "15px NotoJP";
  x.fillText(f.t2, cx + 20, cardY + thumbH + 74);
}

// 下部：ドメイン＋登録不要
x.fillStyle = "rgba(255,255,255,0.85)"; x.font = "bold 26px NotoJP";
x.fillText("kakomon-labo.com", 60, H - 46);
x.fillStyle = "#AFC6F0"; x.font = "bold 22px NotoJP"; x.textAlign = "right";
x.fillText("登録不要・スマホでもPCでも", W - 60, H - 46); x.textAlign = "left";

writeFileSync(join(OUT, "features.png"), c.toBuffer("image/png"));
console.log("✅ marketing/x/features.png (1600×900)");
