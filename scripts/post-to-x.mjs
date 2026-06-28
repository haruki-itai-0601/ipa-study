#!/usr/bin/env node
// 本物の過去問を1問選び、X(旧Twitter)へ自動投稿する（1日1ツイート・/qページへのリンク付き）。
// GitHub Actions の1日1回スケジュールから呼ばれる想定。重複は social_posts テーブルで回避。
//
//   環境変数（GitHub Secrets / ローカルは .env.local）:
//     SUPABASE_URL（無ければ NEXT_PUBLIC_SUPABASE_URL）
//     SUPABASE_SERVICE_ROLE_KEY    social_posts の読み書き＋questions読み取り
//     X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET  (X API OAuth1.0a)
//   使い方:
//     node scripts/post-to-x.mjs            # 実投稿
//     node scripts/post-to-x.mjs --dry-run  # 投稿せず内容だけ表示

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { TwitterApi } from "twitter-api-v2";
import { renderCard } from "./question-card.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LINK = "https://kakomon-labo.com";

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

function xlen(s) { s = s.replace(/https?:\/\/\S+/g, "x".repeat(23)); let n = 0; for (const c of s) n += c.codePointAt(0) <= 0x7f ? 1 : 2; return n; }

// スパム判定(同一文反復)回避のため、見出し・誘導文をローテーション
const INTROS = ["【今日の1問】", "【過去問チャレンジ】", "📝 今日の過去問", "🎯 腕試し1問", "💡 今日の1問"];
const CTAS = [
  "ぜひサイトに来て回答してみてください😊\n選択肢・解答・解説はこちら👇",
  "あなたは解けますか？選択肢・解答・解説はこちら👇",
  "サイトで実際に解いて答え合わせ！選択肢・解答・解説はこちら👇",
  "ア〜エ、どれだと思う？答え合わせはこちら👇",
  "解けたらすごい💪 選択肢・解答・解説はこちら👇",
];
// 問題ID＋日付で決定的にバリアントを選ぶ（毎回ランダムではなく安定だが多様）
function variantSeed(q) {
  const s = q.id + new Date().toISOString().slice(0, 10);
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
// 計測用UTM付きの問題ページURL
function qUrl(q) {
  return `${LINK}/q/${q.id}?utm_source=x&utm_medium=social&utm_campaign=daily_quiz`;
}
function tweetText(q, em) {
  const h = variantSeed(q);
  const intro = INTROS[h % INTROS.length];
  const cta = CTAS[(h >>> 3) % CTAS.length];
  return `${intro}〔${em.name}／${q.year}〕\n${q.question}\n\n${cta}\n${qUrl(q)}\n${em.tags.join(" ")}`;
}

async function pick(supabase) {
  const { data: qs, error } = await supabase
    .from("questions")
    .select("id,exam_id,year,question,option_a,option_b,option_c,option_d,correct_answer,explanation")
    .eq("type", "past");
  if (error) throw new Error("questions: " + error.message);
  const pool = qs.filter(
    (q) => q.question && q.question.length >= 18 &&
      !/[図表]/.test(q.question) && !/アローダイアグラム|グラフ|次のプログラム|流れ図/.test(q.question) &&
      xlen(tweetText(q, EXAM[q.exam_id] || { name: q.exam_id, tags: [] })) <= 280
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
  if (!SUPA_URL || !SUPA_KEY) throw new Error("SUPABASE_URL / キー が必要です");
  const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

  const q = await pick(supabase);
  const em = EXAM[q.exam_id] || { name: q.exam_id, tags: [] };
  const text = tweetText(q, em);
  // 1日2本（朝7:30 / 夕19:00 JST）なので、JST時刻で「今日の問題（1/2 or 2/2）」を出し分ける
  const jstHour = (new Date().getUTCHours() + 9) % 24;
  const cardTitle = jstHour < 14 ? "今日の問題（1/2）" : "今日の問題（2/2）";
  const img = renderCard(q, em, { title: cardTitle }); // 問題カード画像（滞在時間UP・リンク投稿の弱さを補う）
  console.log(`question ${q.id} (${q.exam_id}/${q.year}) / ${xlen(text)}字\n--- TWEET ---\n${text}`);

  if (dry) {
    writeFileSync("/tmp/last-card.png", img);
    console.log("\n[dry-run] 投稿しません。カード画像は /tmp/last-card.png に保存しました。");
    return;
  }

  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    throw new Error("X APIの認証情報(X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET)が必要です");
  }
  const x = new TwitterApi({
    appKey: X_API_KEY, appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN, accessSecret: X_ACCESS_SECRET,
  }).readWrite;

  const mediaId = await x.v1.uploadMedia(img, { mimeType: "image/png" });
  const t = await x.v2.tweet({ text, media: { media_ids: [mediaId] } });
  await supabase.from("social_posts").insert({ question_id: q.id, slot: "x", tweet_id: t.data.id });
  console.log(`\n投稿完了: https://x.com/i/web/status/${t.data.id}`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
