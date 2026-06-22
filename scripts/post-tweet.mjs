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

// ───────── サービスPR投稿（夜の枠）─────────
// 「問題を出すだけ」だと来訪に繋がらないため、サイトの強みを日替わりで宣伝する。
// 本文はリンクなし（到達優先）＋1個目のリプにリンク、の形は問題投稿と同じ。
const PR_POSTS = [
  {
    text:
      "応用情報の午後、自分で採点できないのが一番つらい。\n\n" +
      "記述式の答案を、AIが○△×＋講評で採点します。過去問演習はぜんぶ無料。\n\n" +
      "#応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com/exam/ap\n令和3〜7年度の午後に対応。まずは無料の過去問から。",
  },
  {
    text:
      "「どこが弱いか分からない」を、AIが解決。\n\n" +
      "解いた問題からAIが弱点を分析し、次にやるべき分野まで提案。過去問1万問超がぜんぶ無料。\n\n" +
      "#基本情報技術者試験 #ITパスポート",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com\nAI弱点分析つきの過去問演習。スマホでサクサク。",
  },
  {
    text:
      "広告だらけで集中できない…という過去問サイトに疲れた人へ。\n\n" +
      "じゃまな広告なし・過去問は無料・午後はAIが採点。そんな学習サイトを作りました。\n\n" +
      "#ITパスポート #基本情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
  },
  {
    text:
      "ITパスポート2,900問／基本情報1,760問／応用情報 午前2,640問。\n\n" +
      "本物の過去問がぜんぶ無料で解けて、AIが弱点まで分析します。\n\n" +
      "#ITパスポート #基本情報技術者試験 #応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
  },
  {
    text:
      "過去問を自分で選び、弱点を探し、解説を本で読む時代は終わり。\n\n" +
      "AIエージェントと解いて、弱点を分析、次の一手まで提案。気づいたら身につく学習サイトです。\n\n" +
      "#応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
  },
  {
    text:
      "通勤・休憩のスキマに、スマホで過去問。\n\n" +
      "解くだけでAIが弱点を可視化し、合格への最短ルートを提示します。過去問演習は無料。\n\n" +
      "#基本情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
  },
  {
    text:
      "応用情報の合否は午後で決まる。\n\n" +
      "でも午後の記述、自分で採点できない——をAIが解決。○△×＋講評で採点し、弱点まで教えます。\n\n" +
      "#応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com/exam/ap",
  },
  {
    text:
      "AIが弱点から「次にやるべき演習」を提案するAIレコメンド、はじめました。\n\n" +
      "過去問は無料。AIレコメンド＋午後AI採点のプレミアムは初月無料でお試しOK。\n\n" +
      "#応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
  },
];

// 日替わりでローテーション（毎日ちがうPRが出る・約8日で一周）
function pickPrPost() {
  const day = Math.floor(Date.now() / 86400000);
  return PR_POSTS[day % PR_POSTS.length];
}

async function main() {
  const type = (process.env.POST_TYPE || "question").toLowerCase();
  const { X_APP_KEY, X_APP_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  const hasCreds = X_APP_KEY && X_APP_SECRET && X_ACCESS_TOKEN && X_ACCESS_SECRET;
  const newClient = () =>
    new TwitterApi({
      appKey: X_APP_KEY, appSecret: X_APP_SECRET,
      accessToken: X_ACCESS_TOKEN, accessSecret: X_ACCESS_SECRET,
    });

  // ── サービスPR投稿（夜の枠：POST_TYPE=pr）──
  if (type === "pr") {
    const pr = pickPrPost();
    if (!hasCreds) {
      console.log("=== ドライラン（PR投稿・X認証なし）===");
      console.log("【本文】\n" + pr.text);
      console.log("【リプライ】\n" + pr.reply);
      console.log(`--- 本文 weighted: ${weight(pr.text)} / 280 ---`);
      return;
    }
    const client = newClient();
    const head = await client.v2.tweet({ text: pr.text });
    const headId = head?.data?.id;
    let replyId = null;
    if (headId) {
      const reply = await client.v2.tweet({ text: pr.reply, reply: { in_reply_to_tweet_id: headId } });
      replyId = reply?.data?.id;
    }
    console.log("PR投稿成功:", headId, "リプ:", replyId);
    return;
  }

  // ── 今日の1問（問題アンケート投稿・朝の枠：POST_TYPE=question）──
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const q = await pickQuestion(sb);
  if (!q) { console.error("出題できる問題が見つかりませんでした"); process.exit(1); }
  const { text, options, replyText } = buildPost(q);

  if (!hasCreds) {
    console.log("=== ドライラン（X認証なし・投稿しません）===");
    console.log("【本文（アンケート）】");
    console.log(text);
    console.log("【選択肢】", options.map((o, i) => `${["ア", "イ", "ウ", "エ"][i]} ${o}`).join(" / "));
    console.log("【リプライ】");
    console.log(replyText);
    console.log(`--- 本文 weighted: ${weight(text)} / 280 ---`);
    return;
  }
  const client = newClient();
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
