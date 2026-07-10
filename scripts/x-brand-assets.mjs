// X（旧Twitter）用ブランド素材を生成する。
// デザイン方針（Refero調査 2026-07-10: Duolingo/Quizlet/Gumroad等の学習・プロダクトブランド共通則）
//  - アバターは「文字なし・太い1シンボル・1ブランド色」= 48px表示でも読める
//  - フラスコ（ラボ）×チェックマーク（正解）を1つのマークに統合
//  - ヘッダーは太いタイポ＋「プロダクトが見える」ミニクイズカード
// 出力:
//  - marketing/x/icon.png   … プロフィールアイコン 400×400（円形トリム前提）
//  - marketing/x/header.png … ヘッダー画像 1500×500（左下はアバターで隠れるため中央〜右にセーフエリア）
// 実行: node scripts/x-brand-assets.mjs
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");

const OUT_DIR = join(__dirname, "..", "marketing", "x");
mkdirSync(OUT_DIR, { recursive: true });

const INDIGO = "#4f46e5";
const VIOLET = "#7c3aed";
const GREEN = "#22c55e";

function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

// フラスコ＋液面チェックのマークを描く（中心cx, 上端top, 全体高さhでスケール）
// stroke=本体・液面・泡の色（デフォルト白＝濃色背景用／白背景では brand 青を渡す）
function drawFlaskMark(x, cx, top, h, stroke = "#ffffff") {
  const s = h / 300; // 基準300px設計
  const lw = 26 * s;
  x.lineCap = "round";
  x.lineJoin = "round";

  // 本体（口→首→三角フラスコ）
  x.strokeStyle = stroke;
  x.lineWidth = lw;
  x.beginPath();
  x.moveTo(cx - 30 * s, top + 10 * s); // 口の左
  x.lineTo(cx - 30 * s, top + 90 * s); // 首左
  x.lineTo(cx - 105 * s, top + 250 * s); // 左裾
  x.lineTo(cx + 105 * s, top + 250 * s); // 右裾
  x.lineTo(cx + 30 * s, top + 90 * s); // 首右
  x.lineTo(cx + 30 * s, top + 10 * s); // 口の右
  x.stroke();
  // 口の横棒（少し広く）
  x.beginPath();
  x.moveTo(cx - 52 * s, top + 10 * s);
  x.lineTo(cx + 52 * s, top + 10 * s);
  x.stroke();

  // 液体（面）— フラスコ内側の底までみっちり満たす
  x.fillStyle = stroke;
  x.beginPath();
  x.moveTo(cx - 58 * s, top + 162 * s);
  x.lineTo(cx - 94 * s, top + 239 * s);
  x.lineTo(cx + 94 * s, top + 239 * s);
  x.lineTo(cx + 58 * s, top + 162 * s);
  x.closePath();
  x.fill();

  // 液面のチェックマーク（正解の緑）
  x.strokeStyle = GREEN;
  x.lineWidth = 22 * s;
  x.beginPath();
  x.moveTo(cx - 40 * s, top + 192 * s);
  x.lineTo(cx - 8 * s, top + 218 * s);
  x.lineTo(cx + 48 * s, top + 168 * s);
  x.stroke();

  // 泡
  x.fillStyle = stroke;
  x.beginPath(); x.arc(cx + 52 * s, top + 108 * s, 11 * s, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(cx + 76 * s, top + 74 * s, 7 * s, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(cx + 30 * s, top + 66 * s, 5 * s, 0, Math.PI * 2); x.fill();
}

// ---------------------------------------------------------------------------
// アイコン 400×400 — 文字なし・フラスコ×チェックの1シンボル
// ---------------------------------------------------------------------------
{
  const S = 400;
  const SS = 2; // 2倍解像度で描画（Xが縮小して鮮明に）
  const c = createCanvas(S * SS, S * SS);
  const x = c.getContext("2d");
  x.scale(SS, SS);

  const g = x.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, INDIGO);
  g.addColorStop(1, VIOLET);
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);

  // 円形トリム内に収まる淡い装飾
  x.fillStyle = "rgba(255,255,255,0.10)";
  x.beginPath(); x.arc(S - 78, 82, 92, 0, Math.PI * 2); x.fill();
  x.fillStyle = "rgba(255,255,255,0.07)";
  x.beginPath(); x.arc(72, S - 70, 84, 0, Math.PI * 2); x.fill();

  // フラスコの淡い台座影（Duolingo的な「置いてある」感）
  x.fillStyle = "rgba(0,0,0,0.14)";
  x.beginPath();
  x.ellipse(S / 2, 330, 120, 18, 0, 0, Math.PI * 2);
  x.fill();

  drawFlaskMark(x, S / 2, 58, 268);

  writeFileSync(join(OUT_DIR, "icon.png"), c.toBuffer("image/png"));
  console.log("✅ marketing/x/icon.png (400×400)");
}

// ---------------------------------------------------------------------------
// ヘッダー 1500×500 — 左テキスト＋右ミニクイズカード（プロダクトが見える）
// 左下 約380×220px はアバターで隠れる。重要要素は x>420・y 60〜460 に置く。
// ---------------------------------------------------------------------------
{
  const W = 1500, H = 500;
  const SS = 2; // スーパーサンプリング（2倍解像度で描画→Xが縮小して鮮明に）
  const c = createCanvas(W * SS, H * SS);
  const x = c.getContext("2d");
  x.scale(SS, SS); // 論理座標は 1500×500 のまま、物理解像度だけ2倍

  // ダッシュボードと同じ配色（白基調・ブランド青・正解の緑）
  const INK = "#15202E", MUTED = "#677488", BRAND = "#1D4ED8";
  const BRANDSOFT = "#EAF0FE", LINE = "#E7EBF1", GOODC = "#0F8A5F", GOODSOFT = "#E3F4EC";

  // 背景（白）
  x.fillStyle = "#FFFFFF";
  x.fillRect(0, 0, W, H);

  // 淡い装飾円（ブランドソフト）
  x.fillStyle = BRANDSOFT;
  x.beginPath(); x.arc(W - 90, 60, 220, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(300, H + 70, 210, 0, Math.PI * 2); x.fill();

  // 左のセーフエリア外（アバター裏）にはフラスコを薄く敷いて世界観だけ出す
  x.save();
  x.globalAlpha = 0.10;
  drawFlaskMark(x, 205, 120, 300, BRAND);
  x.restore();

  const LEFT = 435;

  // キッカー（タグライン）
  x.textAlign = "left";
  x.fillStyle = BRAND;
  x.font = "bold 34px NotoJP";
  x.fillText("AIとともに最短合格の道をハックする", LEFT, 120);

  // ブランド名（大）
  x.fillStyle = INK;
  x.font = "bold 102px NotoJP";
  x.fillText("過去問演習ラボ", LEFT, 232);

  // 対象試験（正式名称・現行3試験。2027対応は右上バッジで表現）
  x.fillStyle = MUTED;
  x.font = "bold 22px NotoJP";
  x.fillText("ITパスポート試験／基本情報技術者試験／情報処理安全確保支援士試験", LEFT, 288);

  // 特徴チップ（ブランドソフト背景＋ブランド文字。3つ合計がカードに被らない長さに）
  const chips = ["過去問1万問超 無料", "弱点分析", "弱点分析に応じたレコメンド"];
  let cx2 = LEFT;
  const cy = 328;
  x.font = "bold 21px NotoJP";
  for (const t of chips) {
    const w = x.measureText(t).width + 38;
    x.fillStyle = BRANDSOFT;
    roundRect(x, cx2, cy, w, 50, 25);
    x.fill();
    x.fillStyle = BRAND;
    x.fillText(t, cx2 + 19, cy + 33);
    cx2 += w + 13;
  }

  // ドメイン
  x.fillStyle = MUTED;
  x.font = "bold 26px NotoJP";
  x.fillText("kakomon-labo.com", LEFT, 448);

  // 右：ミニクイズカード（傾けず真っ直ぐ）
  const cardW = 268, cardH = 316;
  const cardX = 1190, cardY = 92;
  x.save();
  // 影（白背景なので薄く）
  x.fillStyle = "rgba(21,32,46,0.12)";
  roundRect(x, cardX + 6, cardY + 10, cardW, cardH, 20);
  x.fill();
  // カード本体（白＋薄い枠線）
  x.fillStyle = "#ffffff";
  roundRect(x, cardX, cardY, cardW, cardH, 20);
  x.fill();
  x.strokeStyle = LINE;
  x.lineWidth = 2;
  roundRect(x, cardX, cardY, cardW, cardH, 20);
  x.stroke();
  // 問題文のダミー行
  x.fillStyle = LINE;
  roundRect(x, cardX + 24, cardY + 26, cardW - 48, 13, 6.5); x.fill();
  roundRect(x, cardX + 24, cardY + 48, cardW - 92, 13, 6.5); x.fill();
  // 選択肢 4行（ウ=正解ハイライト）
  const rows = ["ア", "イ", "ウ", "エ"];
  rows.forEach((label, i) => {
    const ry = cardY + 86 + i * 56;
    const isAns = i === 2;
    if (isAns) {
      x.fillStyle = GOODSOFT;
      roundRect(x, cardX + 16, ry - 8, cardW - 32, 48, 12);
      x.fill();
    }
    // 記号チップ
    x.fillStyle = isAns ? GOODC : BRANDSOFT;
    x.beginPath(); x.arc(cardX + 44, ry + 16, 15, 0, Math.PI * 2); x.fill();
    x.fillStyle = isAns ? "#ffffff" : BRAND;
    x.font = "bold 17px NotoJP";
    x.textAlign = "center";
    x.fillText(label, cardX + 44, ry + 22);
    x.textAlign = "left";
    // 選択肢ダミーバー
    x.fillStyle = isAns ? "#86EFAC" : LINE;
    roundRect(x, cardX + 70, ry + 8, isAns ? 150 : 130, 13, 6.5);
    x.fill();
  });
  x.restore();

  // カードに重なる「2027年新試験対応」ピンクバッジ（傾けず真っ直ぐ・白背景に映えるアクセント）
  const badge = "2027年開始の新試験にも対応";
  x.font = "bold 23px NotoJP";
  const bw = x.measureText(badge).width + 40;
  const bx = cardX - 96, by = 58;
  x.fillStyle = "#EC4899";
  roundRect(x, bx, by, bw, 46, 23);
  x.fill();
  x.fillStyle = "#ffffff";
  x.fillText(badge, bx + 20, by + 31);

  writeFileSync(join(OUT_DIR, "header.png"), c.toBuffer("image/png"));
  console.log("✅ marketing/x/header.png (1500×500)");
}
