#!/usr/bin/env node
// 1週間分(既定21本=1日3回×7日)のX投稿文を生成し、メールで自分に届ける（Resend利用）。
//   環境変数（.env.local もしくは GitHub Secrets）:
//     SUPABASE_URL（無ければ NEXT_PUBLIC_SUPABASE_URL）
//     SUPABASE_ANON_KEY（無ければ NEXT_PUBLIC_SUPABASE_ANON_KEY）  ※questions読み取りのみ
//     RESEND_API_KEY   Resend の API キー（https://resend.com で無料取得）
//     MAIL_TO          送信先（自分のメールアドレス。Resend登録メールなら独自ドメイン不要）
//     MAIL_FROM        差出人（省略時 "過去問道場 <onboarding@resend.dev>"）
//   使い方:
//     node scripts/send-email.mjs            # メール送信
//     node scripts/send-email.mjs --dry-run  # 送らず本文だけ表示
//     node scripts/send-email.mjs --count 21 # 本数指定（既定21）

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LINK = "https://20260524ipa-study.vercel.app";

(function loadEnvLocal() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const EXAM = {
  am1: { name: "午前Ⅰ（高度共通）", tags: ["#高度情報処理", "#情報処理技術者試験"] },
  pm: { name: "プロジェクトマネージャ試験", tags: ["#プロジェクトマネージャ試験", "#PM試験"] },
  sc: { name: "情報処理安全確保支援士試験", tags: ["#情報処理安全確保支援士", "#セキスペ"] },
  nw: { name: "ネットワークスペシャリスト試験", tags: ["#ネットワークスペシャリスト", "#ネスペ"] },
  db: { name: "データベーススペシャリスト試験", tags: ["#データベーススペシャリスト", "#デスペ"] },
  sa: { name: "システムアーキテクト試験", tags: ["#システムアーキテクト試験", "#SA試験"] },
  sm: { name: "ITサービスマネージャ試験", tags: ["#ITサービスマネージャ試験", "#SM試験"] },
  st: { name: "ITストラテジスト試験", tags: ["#ITストラテジスト試験", "#ST試験"] },
  au: { name: "システム監査技術者試験", tags: ["#システム監査技術者試験", "#AU試験"] },
};
const KANA = { a: "ア", b: "イ", c: "ウ", d: "エ" };
const SLOT = ["朝", "昼", "夕"];

// X実効長（日本語など=2、半角=1、URLは23固定）
function xlen(s) { s = s.replace(/https?:\/\/\S+/g, "x".repeat(23)); let n = 0; for (const c of s) n += c.codePointAt(0) <= 0x7f ? 1 : 2; return n; }
// メイン投稿＝問題のみ（選択肢と正解はリプで）
function mainPost(q, em) {
  return `【今日の1問】〔${em.name}／${q.year}〕\n${q.question}\n\nわかった方は、ぜひリプで教えてください😊\n選択肢・正解はリプ欄に👇\n${em.tags.join(" ")}`;
}
// リプ＝選択肢＋正解。締めは「○○試験の対策は過去問サイトで！」（収まらなければ短い締めに自動調整）
function reply(q, em) {
  const opts = `ア ${q.option_a}\nイ ${q.option_b}\nウ ${q.option_c}\nエ ${q.option_d}\n\n正解：${KANA[q.correct_answer]}`;
  const ctas = [
    `\n\n${em.name}の対策は過去問サイトで📚👇（出典：IPA）\n${LINK}`,
    `\n\n過去問サイトで対策👇（出典：IPA）\n${LINK}`,
    `\n👇（出典：IPA）\n${LINK}`,
  ];
  for (const c of ctas) if (xlen(opts + c) <= 280) return opts + c;
  return opts + ctas[2];
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const ci = args.indexOf("--count");
  const count = ci >= 0 ? parseInt(args[ci + 1] || "7", 10) : 7;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // 送信済み記録(social_posts)の読み書きには service_role が必要。無ければ anon にフォールバック（重複除外なし）。
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / キー が必要です");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("questions")
    .select("id,exam_id,year,question,option_a,option_b,option_c,option_d,correct_answer,explanation")
    .eq("type", "past");
  if (error) throw new Error("questions: " + error.message);
  let pool = data.filter(
    (q) => q.question && q.question.length >= 18 && q.question.length <= 72 &&
      !/[図表]/.test(q.question) && !/アローダイアグラム|グラフ|次のプログラム|流れ図/.test(q.question) &&
      // メイン(問題)もリプ(選択肢+正解)も280字に収まるものだけ
      xlen(mainPost(q, EXAM[q.exam_id] || { name: q.exam_id, tags: [] })) <= 280 &&
      xlen(reply(q, EXAM[q.exam_id] || { name: q.exam_id, tags: [] })) <= 280
  );

  // 過去に送った問題を除外（social_posts に記録。service_role時のみ有効）
  let sent = new Set();
  try {
    const { data: done } = await supabase.from("social_posts").select("question_id");
    sent = new Set((done || []).map((r) => r.question_id));
  } catch { /* anon等で読めない場合は除外なし */ }
  let avail = pool.filter((q) => !sent.has(q.id));
  if (avail.length < count) {
    console.log(`[info] 未送信が${avail.length}本のみ→一巡したため全問から再選出します`);
    avail = pool;
  }
  for (let i = avail.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[avail[i], avail[j]] = [avail[j], avail[i]]; }
  const picked = avail.slice(0, count);

  const blocks = picked.map((q, i) => {
    const em = EXAM[q.exam_id] || { name: q.exam_id, tags: [] };
    return `━━━━━ ${i + 1}日目 ━━━━━\n\n【メイン投稿（問題）】\n${mainPost(q, em)}\n\n【リプ（選択肢＋正解）→メイン投稿のスレッドにぶら下げる】\n${reply(q, em)}`;
  });
  const body =
    `今週のX投稿ネタ（${picked.length}本＝1日1本×${picked.length}日分）です。\n` +
    `使い方：各「メイン投稿（問題）」を1日1本ずつ予約 → その下に「リプ（選択肢＋正解）」をスレッドでぶら下げる。\n` +
    `Xの作成画面で「＋」を押すとメイン＋リプを1セットで作って一緒に予約できます。\n` +
    `※手動投稿ならURL付きでも無料です。\n\n` +
    blocks.join("\n\n\n");
  const subject = `📚 今週のX投稿ネタ ${picked.length}本（過去問道場）`;

  if (dry) { console.log("件名:", subject, "\n\n", body); return; }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.MAIL_TO;
  const from = process.env.MAIL_FROM || "過去問道場 <onboarding@resend.dev>";
  if (!apiKey || !to) throw new Error("RESEND_API_KEY / MAIL_TO が必要です");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, text: body }),
  });
  if (!res.ok) throw new Error(`メール送信失敗: ${res.status} ${await res.text()}`);
  console.log(`メール送信しました → ${to}（${picked.length}本）`);

  // 送信した問題を記録（次回から除外）。service_role でなければスキップ。
  try {
    const rows = picked.map((q) => ({ question_id: q.id, slot: "email" }));
    const { error: insErr } = await supabase.from("social_posts").insert(rows);
    if (insErr) console.log(`[info] 送信済み記録はスキップ（${insErr.message}）`);
    else console.log(`[info] ${rows.length}問を送信済みに記録しました`);
  } catch (e) { console.log(`[info] 送信済み記録はスキップ（${e.message}）`); }
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
