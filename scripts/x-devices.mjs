// App Store宣伝風のデバイスモック合成（ノートPC＋iPhone）を生成する。
// 「スマホでもPCでもどちらでも使える」を1枚で伝える。実UIをブランド配色で忠実に再現。
// 出力: marketing/x/devices.png（1600×900・2倍解像度）
// 実行: node scripts/x-devices.mjs
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(__dirname, "..", "assets", "NotoSansJP.ttf"), "NotoJP");
const OUT = join(__dirname, "..", "marketing", "x");
mkdirSync(OUT, { recursive: true });

// 配色（ダッシュボード／ブランド）
const NAVY0 = "#081A38", NAVY1 = "#0E2A50";
const INK = "#15202E", MUTED = "#677488", FAINT = "#9AA6B6";
const BRAND = "#1D4ED8", BRANDSOFT = "#EAF0FE", LINE = "#E7EBF1", BG = "#F5F7FA";
const GOOD = "#0F8A5F", WARN = "#C2410C", BAD = "#DC2626", PINK = "#EC4899", PINKSOFT = "#FDF2F8";
const WHITE = "#FFFFFF";

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
function bar(x, px, py, w, h, r, color) { x.fillStyle = color; rr(x, px, py, w, h, r); x.fill(); }

const W = 1600, H = 900, SS = 2;
const c = createCanvas(W * SS, H * SS);
const x = c.getContext("2d");
x.scale(SS, SS);

// ===== 背景（濃紺グラデ＋グロー） =====
const g = x.createLinearGradient(0, 0, W, H);
g.addColorStop(0, NAVY0); g.addColorStop(1, NAVY1);
x.fillStyle = g; x.fillRect(0, 0, W, H);
const rg = x.createRadialGradient(W * 0.42, H * 0.5, 80, W * 0.42, H * 0.5, 900);
rg.addColorStop(0, "rgba(80,120,200,0.16)"); rg.addColorStop(1, "rgba(80,120,200,0)");
x.fillStyle = rg; x.fillRect(0, 0, W, H);

// ===== 見出し =====
x.textAlign = "left";
x.fillStyle = "#AFC6F0"; x.font = "bold 30px NotoJP";
x.fillText("スマホでも、PCでも。", 96, 108);
x.fillStyle = WHITE; x.font = "bold 60px NotoJP";
x.fillText("どこでも、AIと最短合格。", 92, 182);
x.fillStyle = "rgba(255,255,255,0.85)"; x.font = "bold 27px NotoJP";
x.fillText("過去問1万問超が無料／AIが弱点を分析／登録不要ですぐ使える", 96, 232);

// ===========================================================================
// ダッシュボード画面（ノートPCの中身）
// ===========================================================================
function drawDashboard(x, X, Y, w, h) {
  x.save();
  rr(x, X, Y, w, h, 8); x.clip();
  x.fillStyle = BG; x.fillRect(X, Y, w, h);
  const sw = Math.round(w * 0.26); // サイドバー幅

  // --- サイドバー ---
  x.fillStyle = WHITE; x.fillRect(X, Y, sw, h);
  x.fillStyle = LINE; x.fillRect(X + sw - 1, Y, 1, h);
  let sy = Y + 26;
  x.fillStyle = INK; x.font = "bold 20px NotoJP"; x.textAlign = "left";
  x.fillText("過去問演習ラボ", X + 18, sy + 6);
  x.fillStyle = FAINT; x.font = "12px NotoJP";
  x.fillText("AIとともに最短合格の道をハックする", X + 18, sy + 26);
  sy += 54;
  x.fillStyle = MUTED; x.font = "bold 13px NotoJP"; x.fillText("ダッシュボードを選択", X + 18, sy);
  sy += 12;
  // pink pill (基本情報技術者)
  bar(x, X + 18, sy, sw - 40, 30, 8, PINKSOFT);
  x.strokeStyle = PINK; x.lineWidth = 1.5; rr(x, X + 18, sy, sw - 40, 30, 8); x.stroke();
  x.fillStyle = "#BE185D"; x.font = "bold 13px NotoJP"; x.fillText("基本情報技術者", X + 30, sy + 20);
  x.fillText("v", X + sw - 58, sy + 19);
  sy += 46;
  x.fillStyle = MUTED; x.font = "bold 13px NotoJP"; x.fillText("学習・演習・復習する", X + 18, sy); sy += 10;
  for (const t of ["ITパスポート", "基本情報技術者", "情報処理安全確保支援士"]) {
    x.fillStyle = INK; x.font = "13px NotoJP"; x.fillText(t, X + 22, sy + 16); sy += 26;
  }
  sy += 6;
  // pink new-exam block
  const nbH = 92;
  bar(x, X + 14, sy, sw - 30, nbH, 10, PINKSOFT);
  x.strokeStyle = PINK; x.lineWidth = 1.5; rr(x, X + 14, sy, sw - 30, nbH, 10); x.stroke();
  x.fillStyle = "#BE185D"; x.font = "bold 12px NotoJP"; x.fillText("新試験（仮称）", X + 24, sy + 20);
  x.fillStyle = INK; x.font = "12px NotoJP";
  x.fillText("データマネジメント試験", X + 24, sy + 40);
  x.fillText("プロフェッショナルデジタル", X + 24, sy + 60);
  x.fillText("スキル（3区分）", X + 24, sy + 78);
  sy += nbH + 16;
  for (const t of ["間違えた問題の復習", "用語集", "ログイン・設定"]) {
    x.fillStyle = INK; x.font = "13px NotoJP"; x.fillText(t, X + 22, sy + 12); sy += 26;
  }

  // --- メイン ---
  const mx = X + sw + 26, mw = w - sw - 52;
  let my = Y + 30;
  x.fillStyle = INK; x.font = "bold 26px NotoJP"; x.fillText("こんにちは、ゲストさん", mx, my + 6); my += 40;

  // KPIカード4枚
  const kpis = [["21", "/100", "合格可能性スコア", BAD], ["10", "問", "累計演習数", BRAND], ["1", "日", "連続学習日数", WARN], ["30", "%", "平均正答率", GOOD]];
  const kw = (mw - 3 * 14) / 4, kh = 74;
  kpis.forEach((k, i) => {
    const kx = mx + i * (kw + 14);
    bar(x, kx, my, kw, kh, 12, WHITE);
    x.strokeStyle = LINE; x.lineWidth = 1; rr(x, kx, my, kw, kh, 12); x.stroke();
    x.fillStyle = k[3]; x.font = "bold 30px NotoJP"; x.textAlign = "left";
    x.fillText(k[0], kx + 16, my + 42);
    const nw = x.measureText(k[0]).width;
    x.fillStyle = FAINT; x.font = "12px NotoJP"; x.fillText(k[1], kx + 16 + nw + 2, my + 42);
    x.fillStyle = MUTED; x.font = "11px NotoJP"; x.fillText(k[2], kx + 16, my + 62);
  });
  my += kh + 22;

  // 弱点分析
  x.fillStyle = INK; x.font = "bold 18px NotoJP"; x.fillText("弱点分析 — 分野別正答率", mx, my + 4); my += 24;
  const weak = [["アルゴリズムとプログラミング", 0, BAD], ["経営戦略マネジメント", 12, BAD], ["セキュリティ", 50, WARN], ["データベース", 50, WARN]];
  for (const wk of weak) {
    x.fillStyle = INK; x.font = "13px NotoJP"; x.fillText(wk[0], mx, my + 12);
    x.fillStyle = MUTED; x.font = "bold 13px NotoJP"; x.textAlign = "right";
    x.fillText(wk[1] + "%", mx + mw, my + 12); x.textAlign = "left";
    bar(x, mx, my + 20, mw, 10, 5, LINE);
    if (wk[1] > 0) bar(x, mx, my + 20, mw * (wk[1] / 100), 10, 5, wk[2]);
    my += 40;
  }
  my += 6;

  // 系統レーダー（3つ・簡易）
  x.fillStyle = INK; x.font = "bold 14px NotoJP"; x.fillText("系統ごとの内訳（分野別）", mx, my + 4); my += 16;
  const rW = (mw - 2 * 16) / 3, rH = h - (my - Y) - 20;
  ["ストラテジ系", "マネジメント系", "テクノロジ系"].forEach((label, i) => {
    const cardX = mx + i * (rW + 16);
    bar(x, cardX, my, rW, rH, 12, WHITE);
    x.strokeStyle = LINE; x.lineWidth = 1; rr(x, cardX, my, rW, rH, 12); x.stroke();
    x.fillStyle = INK; x.font = "bold 12px NotoJP"; x.fillText(label, cardX + 12, my + 20);
    // radar hexagon
    const cxp = cardX + rW / 2, cyp = my + rH / 2 + 10, R = Math.min(rW, rH) * 0.32;
    x.strokeStyle = "#D9E1EC"; x.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring++) {
      x.beginPath();
      for (let a = 0; a < 7; a++) { const ang = -Math.PI / 2 + a * Math.PI / 3; const rr2 = R * ring / 3; const px = cxp + Math.cos(ang) * rr2, py = cyp + Math.sin(ang) * rr2; a ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.closePath(); x.stroke();
    }
    // data polygon
    const vals = i === 2 ? [0.5, 0.2, 0.5, 0.3, 0.5, 0.15] : [0.15, 0.1, 0.2, 0.12, 0.1, 0.14];
    x.beginPath();
    for (let a = 0; a < 6; a++) { const ang = -Math.PI / 2 + a * Math.PI / 3; const rr2 = R * vals[a]; const px = cxp + Math.cos(ang) * rr2, py = cyp + Math.sin(ang) * rr2; a ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath();
    x.fillStyle = "rgba(29,78,216,0.18)"; x.fill();
    x.strokeStyle = BRAND; x.lineWidth = 1.5; x.stroke();
  });

  x.restore();
}

// ===========================================================================
// スマホ「今日の5問」画面
// ===========================================================================
function drawPhoneHome(x, X, Y, w, h) {
  x.save();
  rr(x, X, Y, w, h, 30); x.clip();
  x.fillStyle = BG; x.fillRect(X, Y, w, h);
  const pad = 16;
  let py = Y + 30;
  // 上部：試験ピル
  x.fillStyle = FAINT; x.font = "10px NotoJP"; x.textAlign = "left";
  x.fillText("試験の切り替えはこちらから", X + pad, py); py += 8;
  bar(x, X + pad, py, 132, 30, 15, BRANDSOFT);
  x.fillStyle = BRAND; x.font = "bold 13px NotoJP"; x.fillText("基本情報技術者", X + pad + 12, py + 20);
  x.font = "bold 10px NotoJP"; x.fillText("v", X + pad + 116, py + 19);
  py += 46;
  x.fillStyle = INK; x.font = "bold 18px NotoJP"; x.fillText("過去問演習ラボ", X + pad, py); py += 22;
  // KPI 2x2
  const kw = (w - pad * 2 - 10) / 2, kh = 48;
  const kpis = [["21", "/100", "合格可能性"], ["10", "問", "累計演習"], ["1", "日", "連続学習"], ["30", "%", "平均正答率"]];
  kpis.forEach((k, i) => {
    const kx = X + pad + (i % 2) * (kw + 10), ky = py + Math.floor(i / 2) * (kh + 10);
    bar(x, kx, ky, kw, kh, 10, WHITE);
    x.strokeStyle = LINE; x.lineWidth = 1; rr(x, kx, ky, kw, kh, 10); x.stroke();
    x.fillStyle = INK; x.font = "bold 18px NotoJP"; x.fillText(k[0], kx + 10, ky + 30);
    const nw = x.measureText(k[0]).width;
    x.fillStyle = FAINT; x.font = "9px NotoJP"; x.fillText(k[1], kx + 10 + nw + 1, ky + 30);
    x.fillStyle = MUTED; x.font = "10px NotoJP"; x.textAlign = "right"; x.fillText(k[2], kx + kw - 10, ky + 30); x.textAlign = "left";
  });
  py += kh * 2 + 10 + 12;
  // 今日の5問 ジャンボ
  const jH = 120;
  const jg = x.createLinearGradient(X + pad, py, X + w - pad, py + jH);
  jg.addColorStop(0, "#3538CD"); jg.addColorStop(1, BRAND);
  bar(x, X + pad, py, w - pad * 2, jH, 16, "#3B4AE0"); x.fillStyle = jg; rr(x, X + pad, py, w - pad * 2, jH, 16); x.fill();
  x.fillStyle = "rgba(255,255,255,0.9)"; x.font = "bold 11px NotoJP"; x.fillText("弱点分析に基づく、あなたの", X + pad + 16, py + 26);
  x.fillStyle = WHITE; x.font = "bold 30px NotoJP"; x.fillText("今日の5問", X + pad + 16, py + 58);
  x.fillStyle = "rgba(255,255,255,0.9)"; x.font = "11px NotoJP"; x.fillText("弱点「アルゴリズム」から出題します", X + pad + 16, py + 78);
  bar(x, X + pad + 16, py + 90, w - pad * 2 - 32, 30, 15, WHITE);
  x.fillStyle = BRAND; x.font = "bold 13px NotoJP"; x.textAlign = "center";
  x.fillText("解きはじめる  →", X + w / 2, py + 104); x.textAlign = "left";
  py += jH + 12;
  // カード2つ
  for (const [t, s] of [["ステップで学習", "学んで解いて進む"], ["じっくり演習する", "年度別・分野別・模試"]]) {
    bar(x, X + pad, py, w - pad * 2, 44, 12, WHITE);
    x.strokeStyle = LINE; x.lineWidth = 1; rr(x, X + pad, py, w - pad * 2, 44, 12); x.stroke();
    bar(x, X + pad + 10, py + 9, 26, 26, 8, BRANDSOFT);
    x.fillStyle = INK; x.font = "bold 13px NotoJP"; x.fillText(t, X + pad + 46, py + 21);
    x.fillStyle = MUTED; x.font = "10px NotoJP"; x.fillText(s, X + pad + 46, py + 36);
    py += 52;
  }
  // 下タブバー
  const tabH = 52, ty = Y + h - tabH;
  x.fillStyle = WHITE; x.fillRect(X, ty, w, tabH);
  x.fillStyle = LINE; x.fillRect(X, ty, w, 1);
  const tabs = ["ホーム", "データ", "学習", "復習", "設定"];
  tabs.forEach((t, i) => {
    const tx = X + w / 5 * (i + 0.5);
    x.fillStyle = i === 0 ? BRAND : FAINT;
    x.beginPath(); x.arc(tx, ty + 15, 4.5, 0, Math.PI * 2); x.fill();
    x.font = "10px NotoJP"; x.textAlign = "center"; x.fillText(t, tx, ty + 36);
  });
  x.textAlign = "left";
  x.restore();
}

// ===========================================================================
// デバイスフレーム
// ===========================================================================
// ノートPC（MacBook風）
const lapScreenW = 900, lapScreenH = 562;
const lapX = 150, lapY = 268;
// 画面ベゼル
x.save();
x.shadowColor = "rgba(0,0,0,0.45)"; x.shadowBlur = 50; x.shadowOffsetY = 26;
x.fillStyle = "#0B1220"; rr(x, lapX - 16, lapY - 16, lapScreenW + 32, lapScreenH + 32, 20); x.fill();
x.restore();
// 画面
drawDashboard(x, lapX, lapY, lapScreenW, lapScreenH);
// ベゼル枠線
x.strokeStyle = "#20293b"; x.lineWidth = 2; rr(x, lapX - 16, lapY - 16, lapScreenW + 32, lapScreenH + 32, 20); x.stroke();
// ベース（底板）
const baseY = lapY + lapScreenH + 16;
x.fillStyle = "#C3CAD6";
x.beginPath();
x.moveTo(lapX - 60, baseY);
x.lineTo(lapX + lapScreenW + 60, baseY);
x.lineTo(lapX + lapScreenW + 96, baseY + 26);
x.lineTo(lapX - 96, baseY + 26);
x.closePath(); x.fill();
// トラックパッド切り欠き（画面中央下・1つだけ）
bar(x, lapX + lapScreenW / 2 - 60, baseY + 1, 120, 8, 4, "#AAB2C0");

// iPhone（前面・右）
const phW = 288, phH = 604, phX = 1180, phY = 250;
x.save();
x.shadowColor = "rgba(0,0,0,0.5)"; x.shadowBlur = 44; x.shadowOffsetY = 22;
x.fillStyle = "#0B1220"; rr(x, phX - 12, phY - 12, phW + 24, phH + 24, 44); x.fill();
x.restore();
drawPhoneHome(x, phX, phY, phW, phH);
// 枠線
x.strokeStyle = "#20293b"; x.lineWidth = 3; rr(x, phX - 12, phY - 12, phW + 24, phH + 24, 44); x.stroke();
// ダイナミックアイランド
x.fillStyle = "#0B1220"; rr(x, phX + phW / 2 - 42, phY + 12, 84, 22, 11); x.fill();
// ホームインジケータ
x.fillStyle = "rgba(21,32,46,0.35)"; rr(x, phX + phW / 2 - 55, phY + phH - 16, 110, 5, 2.5); x.fill();

// ドメイン
x.fillStyle = "rgba(255,255,255,0.8)"; x.font = "bold 26px NotoJP"; x.textAlign = "left";
x.fillText("kakomon-labo.com", 96, H - 54);

writeFileSync(join(OUT, "devices.png"), c.toBuffer("image/png"));
console.log("✅ marketing/x/devices.png (1600×900)");
