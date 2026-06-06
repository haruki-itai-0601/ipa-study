#!/usr/bin/env node
// 1週間分(既定21本=1日3回×7日)のX投稿文を生成し、LINE（Messaging API）で自分に届ける。
//   環境変数（.env.local もしくは GitHub Secrets）:
//     SUPABASE_URL（無ければ NEXT_PUBLIC_SUPABASE_URL）
//     SUPABASE_ANON_KEY（無ければ NEXT_PUBLIC_SUPABASE_ANON_KEY）  ※questions読み取りのみ
//     LINE_CHANNEL_ACCESS_TOKEN   LINE Messaging API のチャネルアクセストークン（長期）
//     LINE_USER_ID                送信先（自分）のuserID（LINE Developers の Basic settings の「Your user ID」）
//   使い方:
//     node scripts/send-to-line.mjs            # LINEへ送信
//     node scripts/send-to-line.mjs --dry-run  # 送らず内容だけ表示
//     node scripts/send-to-line.mjs --count 21 # 本数指定（既定21）

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

function wlen(s) { let n = 0; for (const c of s) n += c.charCodeAt(0) <= 0x7f ? 0.5 : 1; return Math.ceil(n); }
function mainFull(q, em) {
  return `【今日の1問】〔${em.name}／${q.year}〕\n${q.question}\n\nア ${q.option_a}\nイ ${q.option_b}\nウ ${q.option_c}\nエ ${q.option_d}\n\n正解・解説はアプリで👇（出典：IPA）\n${LINK}\n${em.tags.join(" ")}`;
}
function mainShort(q, em) {
  return `【今日の1問】〔${em.name}／${q.year}〕\n${q.question}\n\nア〜エ、どれ？🤔\n選択肢・正解・解説はアプリで👇（出典：IPA）\n${LINK}\n${em.tags.join(" ")}`;
}
function reply(q, em) {
  return `正解：${KANA[q.correct_answer]}（${q[`option_${q.correct_answer}`]}）\n\n${q.explanation}\n\n本物の過去問2,200問超を無料演習👇\n${LINK}（出典：IPA）`;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const ci = args.indexOf("--count");
  const count = ci >= 0 ? parseInt(args[ci + 1] || "21", 10) : 21;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY が必要です");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("questions")
    .select("exam_id,year,question,option_a,option_b,option_c,option_d,correct_answer,explanation")
    .eq("type", "past");
  if (error) throw new Error("questions: " + error.message);
  const pool = data.filter(
    (q) => q.question && q.question.length >= 18 && q.question.length <= 80 &&
      !/[図表]/.test(q.question) && !/アローダイアグラム|グラフ|次のプログラム|流れ図/.test(q.question)
  );
  // シャッフルして count 本
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picked = pool.slice(0, count);

  // 1本ずつブロック整形
  const blocks = picked.map((q, i) => {
    const em = EXAM[q.exam_id] || { name: q.exam_id, tags: [] };
    const full = mainFull(q, em);
    const m = wlen(full) <= 280 ? full : mainShort(q, em);
    const day = Math.floor(i / 3) + 1;
    const slot = SLOT[i % 3];
    return `━━━ ${i + 1}本目（${day}日目・${slot}）━━━\n【メイン投稿】\n${m}\n\n【正解リプ】\n${reply(q, em)}`;
  });

  // LINEメッセージは1通5000字まで。ブロックを連結して ≤4500字ごとに分割（最大5通）
  const messages = [];
  let buf = "";
  for (const b of blocks) {
    if (wlen(buf) + wlen(b) > 4500 && buf) { messages.push(buf.trim()); buf = ""; }
    buf += b + "\n\n";
  }
  if (buf.trim()) messages.push(buf.trim());
  const header = `📚 今週のX投稿ネタ（${picked.length}本＝1日3回×${Math.ceil(picked.length / 3)}日分）\nXの予約投稿で朝/昼/夕にセットしてね`;
  messages.unshift(header);
  const chunks = messages.slice(0, 5); // LINE push は1リクエスト最大5メッセージ

  if (dry) {
    console.log(`[dry-run] ${picked.length}本 / LINEメッセージ${chunks.length}通\n`);
    console.log(chunks.join("\n\n========【メッセージ区切り】========\n\n"));
    return;
  }
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_USER_ID;
  if (!token || !to) throw new Error("LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID が必要です");
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: chunks.map((t) => ({ type: "text", text: t })) }),
  });
  if (!res.ok) throw new Error(`LINE push失敗: ${res.status} ${await res.text()}`);
  console.log(`LINEへ送信しました（${picked.length}本 / ${chunks.length}通）`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
