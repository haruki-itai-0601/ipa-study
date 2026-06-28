#!/usr/bin/env node
// 週1回、「5問チャレンジ」を告知ツイートで投稿する。区分は毎週ローテーション。
//   環境変数: X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET（ローカルは .env.local 可）
//   使い方:
//     node scripts/post-challenge.mjs            # 実投稿
//     node scripts/post-challenge.mjs --dry-run  # 投稿せず内容/画像だけ確認

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TwitterApi } from "twitter-api-v2";
import { renderChallengeCard } from "./question-card.mjs";

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

// 週ごとにローテーションする順番（人気・受験者数の多い順）
const ROTATION = [
  { id: "sc", name: "情報処理安全確保支援士試験", tags: ["#情報処理安全確保支援士", "#セキスペ"] },
  { id: "pm", name: "プロジェクトマネージャ試験", tags: ["#プロジェクトマネージャ試験", "#PM試験"] },
  { id: "nw", name: "ネットワークスペシャリスト試験", tags: ["#ネットワークスペシャリスト", "#ネスペ"] },
  { id: "db", name: "データベーススペシャリスト試験", tags: ["#データベーススペシャリスト", "#デスペ"] },
  { id: "am1", name: "午前Ⅰ（高度共通）", tags: ["#高度情報処理", "#情報処理技術者試験"] },
  { id: "sa", name: "システムアーキテクト試験", tags: ["#システムアーキテクト試験", "#SA試験"] },
  { id: "st", name: "ITストラテジスト試験", tags: ["#ITストラテジスト試験", "#ST試験"] },
  { id: "sm", name: "ITサービスマネージャ試験", tags: ["#ITサービスマネージャ試験", "#SM試験"] },
  { id: "au", name: "システム監査技術者試験", tags: ["#システム監査技術者試験", "#AU試験"] },
];

function weekIndex() {
  // 1970-01-01(木)起点の週番号。毎週変わる安定値。
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return week % ROTATION.length;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const em = ROTATION[weekIndex()];
  const url = `${LINK}/challenge/${em.id}?utm_source=x&utm_medium=social&utm_campaign=challenge_weekly`;
  const text =
    `【週末の腕試し】${em.name}🧠\n` +
    `この5問、あなたは何問解ける？\n` +
    `1分でできて、その場で答え合わせ＆解説！挑戦してね👇\n` +
    `${url}\n${em.tags.join(" ")}`;
  const img = renderChallengeCard(em);

  console.log(`[week ${weekIndex()}] ${em.id}\n--- TWEET ---\n${text}`);
  if (dry) {
    writeFileSync("/tmp/challenge-card.png", img);
    console.log("\n[dry-run] 投稿しません。バナーは /tmp/challenge-card.png に保存しました。");
    return;
  }
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    throw new Error("X APIの認証情報が必要です");
  }
  const x = new TwitterApi({
    appKey: X_API_KEY, appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN, accessSecret: X_ACCESS_SECRET,
  }).readWrite;
  const mediaId = await x.v1.uploadMedia(img, { mimeType: "image/png" });
  const t = await x.v2.tweet({ text, media: { media_ids: [mediaId] } });
  console.log(`\n投稿完了: https://x.com/i/web/status/${t.data.id}`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
