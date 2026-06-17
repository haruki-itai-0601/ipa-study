// 「今日の1問」自動投稿スクリプト（GitHub Actions から1日2回実行）。
// 図のない本物の過去問をランダムに1問選び、答え・解説ページ(/q/[id])へ誘導するツイートを投稿する。
// X認証(環境変数)が無い場合はドライラン（投稿せず内容を表示）になる。
import { createClient } from "@supabase/supabase-js";
import { TwitterApi } from "twitter-api-v2";

// Supabase の URL と anon(publishable) キーは公開情報（サイトのJSにも含まれる）なので直書きで問題ない
const SUPABASE_URL = "https://qnuedvivehjnfirhnclt.supabase.co";
const SUPABASE_ANON = "sb_publishable_jKuepZmP0Pzj-p688WF8zg_FCGSFxc8";

const EXAMS = {
  ip: { name: "ITパスポート", tag: "#ITパスポート" },
  fe: { name: "基本情報技術者", tag: "#基本情報技術者試験" },
  ap: { name: "応用情報技術者", tag: "#応用情報技術者試験" },
};

// X(Twitter) の文字数カウント近似：CJKは2、その他1、URLは23でカウント
function isWide(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) || (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) || cp >= 0x1f000 // 絵文字も2扱い
  );
}
function weight(str) {
  let w = 0;
  for (const ch of str) w += isWide(ch.codePointAt(0)) ? 2 : 1;
  return w;
}
function trimToWeight(str, max) {
  let w = 0, out = "";
  for (const ch of str) {
    const add = isWide(ch.codePointAt(0)) ? 2 : 1;
    if (w + add > max) return out + "…";
    w += add; out += ch;
  }
  return out;
}

// Xのアンケート選択肢は最大25文字。文字数（コードポイント）で切り詰める
const POLL_MAX = 25;
function truncChars(s, max) {
  const arr = Array.from((s ?? "").replace(/\s+/g, " ").trim());
  return arr.length <= max ? arr.join("") : arr.slice(0, max - 1).join("") + "…";
}
function optionsOf(q) {
  return [q.option_a, q.option_b, q.option_c, q.option_d].map((o) => truncChars(o || "", POLL_MAX));
}
function optionsFitCleanly(q) {
  return [q.option_a, q.option_b, q.option_c, q.option_d].every(
    (o) => o && Array.from(o.trim()).length <= POLL_MAX
  );
}

async function fetchRandom(sb, exam) {
  const base = sb
    .from("questions")
    .select("id, exam_id, question, year, q_number, option_a, option_b, option_c, option_d", { count: "exact" })
    .eq("type", "past").eq("exam_id", exam).is("image_url", null).eq("is_calc", false);
  const { count } = await base.range(0, 0);
  if (!count) return null;
  const off = Math.floor(Math.random() * count);
  const { data } = await sb
    .from("questions")
    .select("id, exam_id, question, year, q_number, option_a, option_b, option_c, option_d")
    .eq("type", "past").eq("exam_id", exam).is("image_url", null).eq("is_calc", false)
    .order("id").range(off, off);
  return data?.[0] ?? null;
}

async function pickQuestion(sb) {
  const ids = Object.keys(EXAMS);
  let fallback = null;
  // 選択肢が4つとも25文字以内に収まる問題（＝アンケートがきれいに出る）を優先的に探す
  for (let attempt = 0; attempt < 12; attempt++) {
    const exam = ids[Math.floor(Math.random() * ids.length)];
    const q = await fetchRandom(sb, exam);
    if (!q || !q.option_a || !q.option_b || !q.option_c || !q.option_d) continue;
    if (!fallback) fallback = q;
    if (optionsFitCleanly(q)) return q;
  }
  return fallback; // 全部長い場合は切り詰めて使う
}

// 本文（リンクなし＝到達ペナルティ回避）＋アンケート選択肢＋リプ用テキストを返す
function buildPost(q) {
  const e = EXAMS[q.exam_id];
  const head = `【今日の1問】${e.name}\n\n`;
  const mid = `\n\n（投票で答えてみよう👇）\n`;
  const tail = `${e.tag} 出典:IPA`;
  const budget = 270 - (weight(head) + weight(mid) + weight(tail));
  const question = trimToWeight(q.question.replace(/\s+/g, " ").trim(), budget);
  const text = `${head}${question}${mid}${tail}`;
  const options = optionsOf(q);
  const replyText = `答え・解説はこちら👇\nhttps://kakomon-dojo.com/q/${q.id}\n出典:IPA`;
  return { text, options, replyText };
}

async function main() {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const q = await pickQuestion(sb);
  if (!q) { console.error("出題できる問題が見つかりませんでした"); process.exit(1); }
  const { text, options, replyText } = buildPost(q);

  const { X_APP_KEY, X_APP_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_APP_KEY || !X_APP_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    console.log("=== ドライラン（X認証なし・投稿しません）===");
    console.log("【本文（アンケート）】");
    console.log(text);
    console.log("【選択肢】", options.map((o, i) => `${["ア", "イ", "ウ", "エ"][i]} ${o}`).join(" / "));
    console.log("【リプライ】");
    console.log(replyText);
    console.log(`--- 本文 weighted: ${weight(text)} / 280 ---`);
    return;
  }
  const client = new TwitterApi({
    appKey: X_APP_KEY, appSecret: X_APP_SECRET,
    accessToken: X_ACCESS_TOKEN, accessSecret: X_ACCESS_SECRET,
  });
  // ①アンケート付きの本文を投稿（リンクなし＝到達優先・24時間アンケート）
  const poll = await client.v2.tweet({ text, poll: { duration_minutes: 1440, options } });
  const pollId = poll?.data?.id;
  // ②その投稿への1個目のリプライにリンク（リンクペナルティ回避＋導線）
  let replyId = null;
  if (pollId) {
    const reply = await client.v2.tweet({ text: replyText, reply: { in_reply_to_tweet_id: pollId } });
    replyId = reply?.data?.id;
  }
  console.log("投稿成功:", pollId, "リプ:", replyId, "/", q.exam_id, q.year, "問", q.q_number);
}

main().catch((e) => { console.error("投稿失敗:", e?.message || e); process.exit(1); });
