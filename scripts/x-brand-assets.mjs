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
function drawFlaskMark(x, cx, top, h) {
  const s = h / 300; // 基準300px設計
  const lw = 26 * s;
  x.lineCap = "round";
  x.lineJoin = "round";

  // 本体（口→首→三角フラスコ）
  x.strokeStyle = "#ffffff";
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

  // 液体（白面）— フラスコ内側の底までみっちり満たす
  x.fillStyle = "#ffffff";
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
  x.fillStyle = "#ffffff";
  x.beginPath(); x.arc(cx + 52 * s, top + 108 * s, 11 * s, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(cx + 76 * s, top + 74 * s, 7 * s, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(cx + 30 * s, top + 66 * s, 5 * s, 0, Math.PI * 2); x.fill();
}

// ---------------------------------------------------------------------------
// アイコン 400×400 — 文字なし・フラスコ×チェックの1シンボル
// ---------------------------------------------------------------------------
{
  const S = 400;
  const c = createCanvas(S, S);
  const x = c.getContext("2d");

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
  const c = createCanvas(W, H);
  const x = c.getContext("2d");

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, INDIGO);
  g.addColorStop(1, VIOLET);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // 淡い装飾円
  x.fillStyle = "rgba(255,255,255,0.07)";
  x.beginPath(); x.arc(W - 90, 60, 220, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(300, H + 60, 220, 0, Math.PI * 2); x.fill();

  // 左のセーフエリア外（アバター裏）にはフラスコを薄く敷いて世界観だけ出す
  x.save();
  x.globalAlpha = 0.16;
  drawFlaskMark(x, 205, 120, 300);
  x.restore();

  const LEFT = 435;

  // キッカー（タグライン）
  x.textAlign = "left";
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.font = "bold 34px NotoJP";
  x.fillText("AIとともに最短合格の道をハックする", LEFT, 120);

  // ブランド名（大）
  x.fillStyle = "#ffffff";
  x.font = "bold 102px NotoJP";
  x.fillText("過去問演習ラボ", LEFT, 232);

  // 対象試験（カードに被らない幅に収める）
  x.fillStyle = "rgba(255,255,255,0.85)";
  x.font = "bold 26px NotoJP";
  x.fillText("ITパスポート／基本情報／応用情報／支援士／2027年新試験", LEFT, 288);

  // 特徴チップ（3つ合計がカード左端 x=1180 を超えない長さに）
  const chips = ["過去問1万問超 無料", "AI弱点分析", "午後記述AI採点"];
  let cx2 = LEFT;
  const cy = 330;
  x.font = "bold 25px NotoJP";
  for (const t of chips) {
    const w = x.measureText(t).width + 44;
    x.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(x, cx2, cy, w, 52, 26);
    x.fill();
    x.strokeStyle = "rgba(255,255,255,0.35)";
    x.lineWidth = 2;
    roundRect(x, cx2, cy, w, 52, 26);
    x.stroke();
    x.fillStyle = "#ffffff";
    x.fillText(t, cx2 + 22, cy + 35);
    cx2 += w + 16;
  }

  // ドメイン
  x.fillStyle = "rgba(255,255,255,0.78)";
  x.font = "bold 26px NotoJP";
  x.fillText("kakomon-labo.com", LEFT, 448);

  // 右：ミニクイズカード（少し傾けてステッカー風に）
  const cardW = 268, cardH = 316;
  const cardX = 1180, cardY = 92;
  x.save();
  x.translate(cardX + cardW / 2, cardY + cardH / 2);
  x.rotate((-3.2 * Math.PI) / 180);
  x.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));
  // 影
  x.fillStyle = "rgba(0,0,0,0.22)";
  roundRect(x, cardX + 8, cardY + 12, cardW, cardH, 20);
  x.fill();
  // カード本体
  x.fillStyle = "#ffffff";
  roundRect(x, cardX, cardY, cardW, cardH, 20);
  x.fill();
  // 問題文のダミー行
  x.fillStyle = "#E2E8F0";
  roundRect(x, cardX + 24, cardY + 26, cardW - 48, 13, 6.5); x.fill();
  roundRect(x, cardX + 24, cardY + 48, cardW - 92, 13, 6.5); x.fill();
  // 選択肢 4行（ウ=正解ハイライト）
  const rows = ["ア", "イ", "ウ", "エ"];
  rows.forEach((label, i) => {
    const ry = cardY + 86 + i * 56;
    const isAns = i === 2;
    if (isAns) {
      x.fillStyle = "#DCFCE7";
      roundRect(x, cardX + 16, ry - 8, cardW - 32, 48, 12);
      x.fill();
    }
    // 記号チップ
    x.fillStyle = isAns ? GREEN : "#EEF2FF";
    x.beginPath(); x.arc(cardX + 44, ry + 16, 15, 0, Math.PI * 2); x.fill();
    x.fillStyle = isAns ? "#ffffff" : INDIGO;
    x.font = "bold 17px NotoJP";
    x.textAlign = "center";
    x.fillText(label, cardX + 44, ry + 22);
    x.textAlign = "left";
    // 選択肢ダミーバー
    x.fillStyle = isAns ? "#86EFAC" : "#E2E8F0";
    roundRect(x, cardX + 70, ry + 8, isAns ? 150 : 130, 13, 6.5);
    x.fill();
  });
  x.restore();

  // カードに重なる「2027年新試験対応」ピンクバッジ（ステッカー風）
  const badge = "2027年開始の新試験にも対応";
  x.font = "bold 23px NotoJP";
  const bw = x.measureText(badge).width + 40;
  const bx = cardX - 96, by = 58;
  x.save();
  x.translate(bx + bw / 2, by + 23);
  x.rotate((-3.2 * Math.PI) / 180);
  x.translate(-(bx + bw / 2), -(by + 23));
  x.fillStyle = "#EC4899";
  roundRect(x, bx, by, bw, 46, 23);
  x.fill();
  x.fillStyle = "#ffffff";
  x.fillText(badge, bx + 20, by + 31);
  x.restore();

  writeFileSync(join(OUT_DIR, "header.png"), c.toBuffer("image/png"));
  console.log("✅ marketing/x/header.png (1500×500)");
}
