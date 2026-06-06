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
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picked = pool.slice(0, count);

  const blocks = picked.map((q, i) => {
    const em = EXAM[q.exam_id] || { name: q.exam_id, tags: [] };
    const full = mainFull(q, em);
    const m = wlen(full) <= 280 ? full : mainShort(q, em);
    const day = Math.floor(i / 3) + 1;
    return `━━━━━ ${i + 1}本目（${day}日目・${SLOT[i % 3]}）━━━━━\n\n【メイン投稿】\n${m}\n\n【正解リプ（メインへのリプライ）】\n${reply(q, em)}`;
  });
  const body =
    `今週のX投稿ネタ（${picked.length}本＝1日3回×${Math.ceil(picked.length / 3)}日分）です。\n` +
    `Xの予約投稿で、各「メイン投稿」を朝/昼/夕にセットし、「正解リプ」はメインへのリプとしてぶら下げてください。\n` +
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
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
