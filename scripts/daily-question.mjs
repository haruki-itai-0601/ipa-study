#!/usr/bin/env node
// 「1日1問」X投稿文を、DBの本物の過去問から自動生成するスクリプト。
//   使い方:
//     node scripts/daily-question.mjs            # 今日の1問（メイン投稿＋リプ）を出力
//     node scripts/daily-question.mjs --backlog 14  # 今日から14日分をまとめて出力
//     node scripts/daily-question.mjs --mark     # 出力した問題を「投稿済み」として記録（重複回避）
//   .env.local の NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を使用（読み取りのみ）。

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LINK = "https://kakomon-dojo.com";
const POSTED_LOG = join(__dirname, ".posted-questions.json");

// --- .env.local 読み込み ---
function loadEnv() {
  const p = join(ROOT, ".env.local");
  const env = {};
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const EXAM = {
  am1: { name: "午前Ⅰ（高度共通）", am: "午前Ⅰ", tags: ["#高度情報処理", "#情報処理技術者試験"] },
  pm: { name: "プロジェクトマネージャ試験", am: "午前Ⅱ", tags: ["#プロジェクトマネージャ試験", "#PM試験"] },
  sc: { name: "情報処理安全確保支援士試験", am: "午前Ⅱ", tags: ["#情報処理安全確保支援士", "#セキスペ"] },
  nw: { name: "ネットワークスペシャリスト試験", am: "午前Ⅱ", tags: ["#ネットワークスペシャリスト", "#ネスペ"] },
  db: { name: "データベーススペシャリスト試験", am: "午前Ⅱ", tags: ["#データベーススペシャリスト", "#デスペ"] },
  sa: { name: "システムアーキテクト試験", am: "午前Ⅱ", tags: ["#システムアーキテクト試験", "#SA試験"] },
  sm: { name: "ITサービスマネージャ試験", am: "午前Ⅱ", tags: ["#ITサービスマネージャ試験", "#SM試験"] },
  st: { name: "ITストラテジスト試験", am: "午前Ⅱ", tags: ["#ITストラテジスト試験", "#ST試験"] },
  au: { name: "システム監査技術者試験", am: "午前Ⅱ", tags: ["#システム監査技術者試験", "#AU試験"] },
};
const KANA = { a: "ア", b: "イ", c: "ウ", d: "エ" };

// X(無料)の実効文字数の目安: 半角=0.5, 全角=1。280の重み制限。
function weightedLen(s) {
  let n = 0;
  for (const ch of s) n += ch.charCodeAt(0) <= 0x7f ? 0.5 : 1;
  return Math.ceil(n);
}

function mainPost(q, em) {
  return (
    `【今日の1問】〔${em.name}／${q.year}〕\n` +
    `${q.question}\n\n` +
    `ア ${q.option_a}\n` +
    `イ ${q.option_b}\n` +
    `ウ ${q.option_c}\n` +
    `エ ${q.option_d}\n\n` +
    `正解・解説はアプリで👇（出典：IPA）\n${LINK}\n` +
    `${em.tags.join(" ")}`
  );
}

function mainPostShort(q, em) {
  return (
    `【今日の1問】〔${em.name}／${q.year}〕\n` +
    `${q.question}\n\n` +
    `ア〜エ、どれ？🤔\n選択肢・正解・解説はアプリで👇（出典：IPA）\n${LINK}\n` +
    `${em.tags.join(" ")}`
  );
}

function replyPost(q, em) {
  const ansText = q[`option_${q.correct_answer}`];
  return (
    `正解：${KANA[q.correct_answer]}（${ansText}）\n\n` +
    `${q.explanation}\n\n` +
    `本物の過去問2,200問超を無料演習👇\n${LINK}（出典：IPA）`
  );
}

// 日付を種にした決定的インデックス（同じ日は同じ問題）
function dateSeed(d) {
  const s = d.toISOString().slice(0, 10);
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("ERROR: .env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が必要です。");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  // ツイート向きの「短め・図表なし」の問題だけを対象に取得
  const { data, error } = await supabase
    .from("questions")
    .select("id,exam_id,year,q_number,question,option_a,option_b,option_c,option_d,correct_answer,explanation")
    .eq("type", "past");
  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }
  const pool = data.filter(
    (q) =>
      q.question &&
      q.question.length >= 18 &&
      q.question.length <= 80 &&
      !/[図表]/.test(q.question) &&
      !/アローダイアグラム|グラフ|次のプログラム|流れ図/.test(q.question)
  );

  const posted = existsSync(POSTED_LOG) ? new Set(JSON.parse(readFileSync(POSTED_LOG, "utf8"))) : new Set();
  let avail = pool.filter((q) => !posted.has(q.id));
  if (avail.length === 0) avail = pool; // 一巡したらリセット
  avail.sort((a, b) => (a.id < b.id ? -1 : 1)); // 安定順

  const args = process.argv.slice(2);
  const backlogIdx = args.indexOf("--backlog");
  const days = backlogIdx >= 0 ? parseInt(args[backlogIdx + 1] || "7", 10) : 1;
  const mark = args.includes("--mark");

  const chosenIds = [];
  const used = new Set();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    let idx = dateSeed(d) % avail.length;
    for (let k = 0; k < avail.length && used.has(avail[idx].id); k++) idx = (idx + 1) % avail.length;
    const q = avail[idx];
    used.add(q.id);
    chosenIds.push(q.id);
    const em = EXAM[q.exam_id] || { name: q.exam_id, tags: [] };

    const main = mainPost(q, em);
    const short = mainPostShort(q, em);
    const reply = replyPost(q, em);
    const label = i === 0 ? "今日" : `${i}日後`;
    console.log(`\n================ ${label}（${d.toISOString().slice(0, 10)}） ================`);
    console.log(`■ メイン投稿（${weightedLen(main)}/280）`);
    console.log(main);
    if (weightedLen(main) > 140) {
      console.log(`\n  ↑280超のため、選択肢省略版（${weightedLen(short)}/280）を推奨:`);
      console.log(short);
    }
    console.log(`\n■ リプライ（正解・解説）（${weightedLen(reply)}/280）`);
    console.log(reply);
  }

  if (mark) {
    const next = Array.from(new Set([...posted, ...chosenIds]));
    writeFileSync(POSTED_LOG, JSON.stringify(next, null, 0));
    console.log(`\n[mark] ${chosenIds.length}問を投稿済みに記録しました（計${next.length}問）。`);
  } else {
    console.log(`\n（--mark を付けると、上記を投稿済みとして記録し次回から除外します。プール対象 ${pool.length}問 / 未投稿 ${avail.length}問）`);
  }
}

main();
