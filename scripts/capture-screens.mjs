// 実ブラウザ(システムChrome)で実際のサイトを操作し、データ入りの本物のスクショを撮る。
// - /shindan/fe を10問解いて弱点データを作る → その匿名セッションで
//   モバイルホーム(今日の5問)とPCダッシュボード(弱点分析)を撮影。
// 前提: dev server が localhost:3000 で稼働 / puppeteer-core を導入済み(--no-save可)。
// 出力: marketing/x/shot-mobile.png, marketing/x/shot-desktop.png
// 実行: node scripts/capture-screens.mjs
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "marketing", "x");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hideDevOverlay(page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((e) => e.remove());
    const s = document.createElement("style");
    s.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(s);
  });
}

async function clickByText(page, re) {
  return page.evaluate((reSrc) => {
    const rx = new RegExp(reSrc);
    const el = [...document.querySelectorAll("button,a")].find((e) => rx.test(e.textContent.trim()));
    if (el) { el.click(); return true; }
    return false;
  }, re.source);
}

const main = async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: "/tmp/pptr-kakomon-profile", // 既存Chromeプロファイルと競合させない
    args: ["--no-sandbox", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  // 診断の問題取得レスポンスを傍受して「問題文→正解(a/b/c/d)」を得る（見栄えの良い代表スコアに調整するため）
  const correctByQ = new Map();
  page.on("response", async (res) => {
    try {
      if (!/\/rest\/v1\/questions/.test(res.url())) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      for (const q of data) {
        if (q && q.question && q.correct_answer) correctByQ.set(q.question.replace(/\s+/g, "").slice(0, 40), q.correct_answer);
      }
    } catch {}
  });
  const KANA = { a: "ア", b: "イ", c: "ウ", d: "エ" };

  // オンボーディングpopupを抑止＋試験をfeに
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.setItem("labOnboardedV1", "1"); localStorage.setItem("labActiveExam", "fe"); });

  // ── 診断を10問解いて弱点データを作る ──
  await page.goto(BASE + "/shindan/fe", { waitUntil: "networkidle2" });
  await sleep(800);
  await clickByText(page, /診断をはじめる/);
  await sleep(2500);
  for (let i = 0; i < 10; i++) {
    const wantCorrect = i < 7; // 7問正解/3問不正解 ≒ 70点(合格圏)
    // 出題文＝main内で選択肢ボタンより前にある最長の段落
    const qnorm = await page.evaluate(() => {
      const ps = [...document.querySelectorAll("main p")].map((p) => p.textContent.replace(/\s+/g, ""));
      return ps.sort((a, b) => b.length - a.length)[0] || "";
    });
    let ans = null;
    for (const [key, a] of correctByQ) { if (qnorm && (qnorm.includes(key) || key.includes(qnorm.slice(0, 30)))) { ans = a; break; } }
    let clickKana = ans ? KANA[ans] : null;
    if (clickKana && !wantCorrect) clickKana = ["ア", "イ", "ウ", "エ"].filter((k) => k !== clickKana)[0];
    const clicked = await page.evaluate((kana) => {
      const opts = [...document.querySelectorAll("button")].filter((b) => /^\s*[アイウエ]/.test(b.textContent.trim()));
      const btn = kana ? opts.find((b) => b.textContent.trim().startsWith(kana)) : opts[0];
      (btn || opts[0])?.click();
      return !!(btn || opts[0]);
    }, clickKana);
    await sleep(650);
    await clickByText(page, /次の問題|次へ|結果/);
    await sleep(900);
    if (i === 0) console.log(`  q1 matched=${ans ? "yes" : "NO"} clicked=${clicked}`);
  }
  // 結果画面に確実に到達させる（最終問の描画待ちで取りこぼすため retry）
  for (let t = 0; t < 8; t++) {
    const onResult = await page.evaluate(() => /の結果/.test(document.body.innerText));
    if (onResult) break;
    await clickByText(page, /結果|次の問題|次へ/);
    await sleep(1000);
  }
  await sleep(1000);
  console.log("診断完了:", (await page.evaluate(() => document.body.innerText.slice(0, 60))).replace(/\n/g, " "));

  // ── 診断結果(AIの分析)を撮影（固定ポスト用） ──
  await hideDevOverlay(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  await page.screenshot({ path: join(OUT, "shot-diagnosis.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });
  console.log("✅ marketing/x/shot-diagnosis.png");

  // ── モバイルホーム(今日の5問)を撮影 ──
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await sleep(1500);
  await hideDevOverlay(page);
  await page.screenshot({ path: join(OUT, "shot-mobile.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });
  console.log("✅ marketing/x/shot-mobile.png");

  // ── PCダッシュボード(弱点分析)を撮影 ──
  await page.setViewport({ width: 1512, height: 945, deviceScaleFactor: 2 });
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await sleep(1800);
  await hideDevOverlay(page);
  await page.screenshot({ path: join(OUT, "shot-desktop.png"), clip: { x: 0, y: 0, width: 1512, height: 945 } });
  console.log("✅ marketing/x/shot-desktop.png");

  await browser.close();
};

main().catch((e) => { console.error("capture failed:", e); process.exit(1); });
