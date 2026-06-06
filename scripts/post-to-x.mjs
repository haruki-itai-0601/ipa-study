#!/usr/bin/env node
// 本物の過去問を1問選び、X(旧Twitter)へ自動投稿する（メイン投稿＋正解リプ）。
// GitHub Actions のスケジュールから 朝/昼/夕 に呼ばれる想定。重複は social_posts テーブルで回避。
//
//   環境変数（GitHub Secrets / ローカルは .env.local）:
//     SUPABASE_URL                 (無ければ NEXT_PUBLIC_SUPABASE_URL を使用)
//     SUPABASE_SERVICE_ROLE_KEY    social_posts の読み書き＋questions読み取りに使用
//     X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET  (X APIのOAuth1.0a)
//
//   使い方:
//     node scripts/post-to-x.mjs            # 実投稿
//     node scripts/post-to-x.mjs --dry-run  # 投稿せず内容だけ表示（X認証情報なしでも可）

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { TwitterApi } from "twitter-api-v2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LINK = "https://20260524ipa-study.vercel.app";

// .env.local（ローカル実行用）を読み、未設定の環境変数だけ補完
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

function weightedLen(s) {
  let n = 0;
  for (const ch of s) n += ch.charCodeAt(0) <= 0x7f ? 0.5 : 1;
  return Math.ceil(n);
}
function mainFull(q, em) {
  return (
    `【今日の1問】〔${em.name}／${q.year}〕\n${q.question}\n\n` +
    `ア ${q.option_a}\nイ ${q.option_b}\nウ ${q.option_c}\nエ ${q.option_d}\n\n` +
    `正解・解説はアプリで👇（出典：IPA）\n${LINK}\n${em.tags.join(" ")}`
  );
}
function mainShort(q, em) {
  return (
    `【今日の1問】〔${em.name}／${q.year}〕\n${q.question}\n\n` +
    `ア〜エ、どれ？🤔\n選択肢・正解・解説はアプリで👇（出典：IPA）\n${LINK}\n${em.tags.join(" ")}`
  );
}
function reply(q, em) {
  const ans = q[`option_${q.correct_answer}`];
  return `正解：${KANA[q.correct_answer]}（${ans}）\n\n${q.explanation}\n\n本物の過去問2,200問超を無料演習👇\n${LINK}（出典：IPA）`;
}
function slotNow() {
  const h = (new Date().getUTCHours() + 9) % 24; // JST
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "noon";
  return "evening";
}

async function pickQuestion(supabase) {
  const { data: qs, error } = await supabase
    .from("questions")
    .select("id,exam_id,year,question,option_a,option_b,option_c,option_d,correct_answer,explanation")
    .eq("type", "past");
  if (error) throw new Error("questions: " + error.message);
  const pool = qs.filter(
    (q) =>
      q.question &&
      q.question.length >= 18 &&
      q.question.length <= 80 &&
      !/[図表]/.test(q.question) &&
      !/アローダイアグラム|グラフ|次のプログラム|流れ図/.test(q.question)
  );
  const { data: done } = await supabase.from("social_posts").select("question_id");
  const posted = new Set((done || []).map((r) => r.question_id));
  let avail = pool.filter((q) => !posted.has(q.id));
  if (avail.length === 0) avail = pool; // 一巡したら最初から
  return avail[Math.floor(Math.random() * avail.length)];
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPA_URL || !SUPA_KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

  const q = await pickQuestion(supabase);
  const em = EXAM[q.exam_id] || { name: q.exam_id, tags: [] };
  const full = mainFull(q, em);
  const mainText = weightedLen(full) <= 270 ? full : mainShort(q, em);
  const replyText = reply(q, em);
  const slot = slotNow();

  console.log(`[slot=${slot}] question ${q.id} (${q.exam_id}/${q.year})`);
  console.log("--- MAIN (" + weightedLen(mainText) + "/280) ---\n" + mainText);
  console.log("--- REPLY (" + weightedLen(replyText) + "/280) ---\n" + replyText);

  if (dry) {
    console.log("\n[dry-run] 投稿・記録はしませんでした。");
    return;
  }

  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    throw new Error("X APIの認証情報(X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET)が必要です");
  }
  const x = new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  }).readWrite;

  const t1 = await x.v2.tweet(mainText);
  const tweetId = t1.data.id;
  await x.v2.reply(replyText, tweetId);
  await supabase.from("social_posts").insert({ question_id: q.id, slot, tweet_id: tweetId });
  console.log(`\n投稿完了: https://x.com/i/web/status/${tweetId}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
