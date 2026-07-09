// X（旧Twitter）用ブランド素材を生成する。
// - marketing/x/icon.png   … プロフィールアイコン 400×400（円形トリム前提）
// - marketing/x/header.png … ヘッダー画像 1500×500（左下はアバターで隠れるため中央〜右にセーフエリア）
// 実行: node scripts/x-brand-assets.mjs
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");

const OUT_DIR = join(__dirname, "..", "marketing", "x");
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// アイコン 400×400
// ---------------------------------------------------------------------------
{
  const S = 400;
  const c = createCanvas(S, S);
  const x = c.getContext("2d");

  // 背景グラデ（サイトヒーローと同じインディゴ→バイオレット）
  const g = x.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, "#4f46e5");
  g.addColorStop(1, "#7c3aed");
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);

  // 装飾の淡い円（円形トリムでも見えるよう内側に）
  x.fillStyle = "rgba(255,255,255,0.10)";
  x.beginPath(); x.arc(S - 70, 70, 100, 0, Math.PI * 2); x.fill();
  x.fillStyle = "rgba(255,255,255,0.07)";
  x.beginPath(); x.arc(60, S - 60, 90, 0, Math.PI * 2); x.fill();

  // フラスコ（ラボの象徴）を線で描く。中央上部。
  const fx = S / 2, fy = 96; // フラスコの首の上端基準
  x.strokeStyle = "rgba(255,255,255,0.95)";
  x.lineWidth = 9;
  x.lineCap = "round";
  x.lineJoin = "round";
  // 首（左右の縦線）→ 三角錐に開く
  x.beginPath();
  x.moveTo(fx - 13, fy);
  x.lineTo(fx - 13, fy + 26);
  x.lineTo(fx - 40, fy + 74);
  x.lineTo(fx + 40, fy + 74);
  x.lineTo(fx + 13, fy + 26);
  x.lineTo(fx + 13, fy);
  x.closePath();
  x.stroke();
  // 口の横棒
  x.beginPath(); x.moveTo(fx - 22, fy - 2); x.lineTo(fx + 22, fy - 2); x.stroke();
  // 中の液体（下側を塗る）
  x.fillStyle = "rgba(255,255,255,0.85)";
  x.beginPath();
  x.moveTo(fx - 27, fy + 51);
  x.lineTo(fx - 37, fy + 69);
  x.lineTo(fx + 37, fy + 69);
  x.lineTo(fx + 27, fy + 51);
  x.closePath();
  x.fill();
  // 泡
  x.fillStyle = "rgba(255,255,255,0.9)";
  x.beginPath(); x.arc(fx + 30, fy + 22, 5, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(fx + 44, fy + 6, 3.5, 0, Math.PI * 2); x.fill();

  // ブランド名（2行・中央）
  x.fillStyle = "#ffffff";
  x.textAlign = "center";
  x.font = "bold 88px NotoJP";
  x.fillText("過去問", S / 2, 268);
  x.fillText("ラボ", S / 2, 356);

  writeFileSync(join(OUT_DIR, "icon.png"), c.toBuffer("image/png"));
  console.log("✅ marketing/x/icon.png (400×400)");
}

// ---------------------------------------------------------------------------
// ヘッダー 1500×500
// 注意: 左下 約380×220px はプロフィールのアバターに隠れる。上下も端は切れやすい。
// 重要要素は x>420・y 90〜430 のセーフエリアに置く。
// ---------------------------------------------------------------------------
{
  const W = 1500, H = 500;
  const c = createCanvas(W, H);
  const x = c.getContext("2d");

  // 背景グラデ
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#4f46e5");
  g.addColorStop(1, "#7c3aed");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // 装飾の淡い円
  x.fillStyle = "rgba(255,255,255,0.08)";
  x.beginPath(); x.arc(W - 130, 80, 240, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(240, H + 40, 200, 0, Math.PI * 2); x.fill();
  x.fillStyle = "rgba(255,255,255,0.05)";
  x.beginPath(); x.arc(W - 420, H - 40, 160, 0, Math.PI * 2); x.fill();

  const LEFT = 450; // アバター被りを避けたセーフエリア左端

  // キッカー（タグライン）
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.font = "bold 36px NotoJP";
  x.textAlign = "left";
  x.fillText("AIとともに最短合格の道をハックする", LEFT, 140);

  // ブランド名（大）
  x.fillStyle = "#ffffff";
  x.font = "bold 104px NotoJP";
  x.fillText("過去問演習ラボ", LEFT, 258);

  // サブ（対象試験）
  x.fillStyle = "rgba(255,255,255,0.85)";
  x.font = "bold 30px NotoJP";
  x.fillText("ITパスポート・基本情報・応用情報・支援士・2027年新試験", LEFT, 314);

  // 特徴チップ 3つ
  const chips = ["IPA過去問 10,000問以上 無料", "AIが弱点を分析", "午後記述をAI採点"];
  let cx = LEFT;
  const cy = 356;
  x.font = "bold 26px NotoJP";
  for (const t of chips) {
    const w = x.measureText(t).width + 48;
    x.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(x, cx, cy, w, 54, 27);
    x.fill();
    x.strokeStyle = "rgba(255,255,255,0.35)";
    x.lineWidth = 2;
    roundRect(x, cx, cy, w, 54, 27);
    x.stroke();
    x.fillStyle = "#ffffff";
    x.fillText(t, cx + 24, cy + 37);
    cx += w + 18;
  }

  // 右上: 2027対応バッジ
  const badge = "2027年開始の新試験にも対応";
  x.font = "bold 24px NotoJP";
  const bw = x.measureText(badge).width + 44;
  const bx = W - bw - 60, by = 52;
  x.fillStyle = "#EC4899";
  roundRect(x, bx, by, bw, 48, 24);
  x.fill();
  x.fillStyle = "#ffffff";
  x.fillText(badge, bx + 22, by + 33);

  // 下部: ドメイン
  x.fillStyle = "rgba(255,255,255,0.75)";
  x.font = "bold 26px NotoJP";
  x.fillText("kakomon-labo.com", LEFT, 452);

  writeFileSync(join(OUT_DIR, "header.png"), c.toBuffer("image/png"));
  console.log("✅ marketing/x/header.png (1500×500)");
}

function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}
