// 「今日の1問」自動投稿スクリプト（GitHub Actions から1日2回実行）。
// 図のない本物の過去問をランダムに1問選び、答え・解説ページ(/q/[id])へ誘導するツイートを投稿する。
// X認証(環境変数)が無い場合はドライラン（投稿せず内容を表示）になる。
import { createClient } from "@supabase/supabase-js";
import { TwitterApi } from "twitter-api-v2";
import { renderPrCard } from "./pr-card.mjs";

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
    card: { title: "午後の記述、\nAIが採点。", sub: "○△×＋講評で、自己採点できない問題まで" },
  },
  {
    text:
      "「どこが弱いか分からない」を、AIが解決。\n\n" +
      "解いた問題からAIが弱点を分析し、次にやるべき分野まで提案。過去問1万問超がぜんぶ無料。\n\n" +
      "#基本情報技術者試験 #ITパスポート",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com\nAI弱点分析つきの過去問演習。スマホでサクサク。",
    card: { title: "「どこが弱いか」\nAIが分析。", sub: "次にやるべき分野まで提案します" },
  },
  {
    text:
      "広告だらけで集中できない…という過去問サイトに疲れた人へ。\n\n" +
      "じゃまな広告なし・過去問は無料・午後はAIが採点。そんな学習サイトを作りました。\n\n" +
      "#ITパスポート #基本情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
    card: { title: "広告ゼロで、\n演習に集中。", sub: "過去問は無料・午後はAIが採点" },
  },
  {
    text:
      "ITパスポート2,900問／基本情報1,760問／応用情報 午前2,640問。\n\n" +
      "本物の過去問がぜんぶ無料で解けて、AIが弱点まで分析します。\n\n" +
      "#ITパスポート #基本情報技術者試験 #応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
    card: { title: "過去問1万問超、\nぜんぶ無料。", sub: "IPパスポート / 基本情報 / 応用情報" },
  },
  {
    text:
      "過去問を自分で選び、弱点を探し、解説を本で読む時代は終わり。\n\n" +
      "AIエージェントと解いて、弱点を分析、次の一手まで提案。気づいたら身につく学習サイトです。\n\n" +
      "#応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
    card: { title: "AIエージェントと、\n最短で合格へ。", sub: "解くだけ。あとはAIが伴走します" },
  },
  {
    text:
      "通勤・休憩のスキマに、スマホで過去問。\n\n" +
      "解くだけでAIが弱点を可視化し、合格への最短ルートを提示します。過去問演習は無料。\n\n" +
      "#基本情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
    card: { title: "スマホで、\nスキマ過去問。", sub: "解くだけでAIが弱点を可視化" },
  },
  {
    text:
      "応用情報の合否は午後で決まる。\n\n" +
      "でも午後の記述、自分で採点できない——をAIが解決。○△×＋講評で採点し、弱点まで教えます。\n\n" +
      "#応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com/exam/ap",
    card: { title: "応用情報は\n午後で決まる。", sub: "記述をAIが採点・弱点まで可視化" },
  },
  {
    text:
      "AIが弱点から「次にやるべき演習」を提案するAIレコメンド、はじめました。\n\n" +
      "過去問は無料。AIレコメンド＋午後AI採点のプレミアムは初月無料でお試しOK。\n\n" +
      "#応用情報技術者試験",
    reply: "👉 過去問演習ラボ\nhttps://kakomon-dojo.com",
    card: { title: "AIレコメンド、\n初月無料。", sub: "弱点から「次の一手」を提案" },
  },
];

// 日替わりでローテーション（毎日ちがうPRが出る・約8日で一周）
function pickPrPost() {
  const day = Math.floor(Date.now() / 86400000);
  return PR_POSTS[day % PR_POSTS.length];
}

// ───────── 解説投稿（夜の枠の軸）─────────
// 「有益7：共感3」の“有益”の中心。頻出用語のミニ解説＋まぎらわしい用語の違い。
// 教育コンテンツは正確性が命なので、AI自動生成ではなく手作りプールで品質を担保（随時追加可）。
const EXPLAIN_REPLY = "👉 関連の過去問を無料で解く\nhttps://kakomon-dojo.com";
const EXPLAIN_POSTS = [
  { card: { title: "DNS", sub: "ドメイン名⇔IPアドレスの名前解決" },
    text: "【3分用語】DNS\n\nドメイン名（example.com）とIPアドレスを相互変換する“名前解決”の仕組み。URLを打つだけでサイトに繋がるのはDNSのおかげ。\n\n#ITパスポート #基本情報技術者試験" },
  { card: { title: "DHCP", sub: "IP設定を自動で割り当てる" },
    text: "【3分用語】DHCP\n\nIPアドレスなどのネットワーク設定を、機器に自動で割り当てる仕組み。LANに繋ぐだけで通信できるのはコレのおかげ。\n\n#基本情報技術者試験 #ITパスポート" },
  { card: { title: "VPN", sub: "公衆網に“仮想の専用線”" },
    text: "【3分用語】VPN\n\n公衆ネットワーク上に暗号化された“仮想の専用線”を作り、安全に通信する技術。リモートワークの定番。\n\n#応用情報技術者試験 #基本情報技術者試験" },
  { card: { title: "RAID", sub: "複数ディスクで冗長化・高速化" },
    text: "【3分用語】RAID\n\n複数のディスクを1台のように扱い、冗長化（故障対策）や高速化を実現する技術。RAID1はミラーリング、RAID5はパリティ分散。\n\n#基本情報技術者試験" },
  { card: { title: "正規化", sub: "DBの重複をなくす整理術" },
    text: "【3分用語】正規化\n\nデータベースで重複やムダをなくし、データを整理する設計手法。更新時の不整合（更新時異常）を防げる。\n\n#基本情報技術者試験 #応用情報技術者試験" },
  { card: { title: "公開鍵暗号", sub: "暗号化と復号で別の鍵" },
    text: "【3分用語】公開鍵暗号\n\n暗号化と復号で“別の鍵”を使う方式。相手の公開鍵で暗号化し、本人だけが秘密鍵で復号できる。鍵配送問題を解決。\n\n#応用情報技術者試験" },
  { card: { title: "デジタル署名", sub: "改ざん検知＋本人確認" },
    text: "【3分用語】デジタル署名\n\n「改ざんされていないこと」と「送信者本人であること」を証明する仕組み。送信者の“秘密鍵”で署名するのがポイント。\n\n#応用情報技術者試験" },
  { card: { title: "SQLインジェクション", sub: "不正なSQLを注入する攻撃" },
    text: "【3分用語】SQLインジェクション\n\n入力欄に不正なSQLを“注入”してDBを不正操作する攻撃。対策はプレースホルダ（バインド機構）の利用。\n\n#基本情報技術者試験 #応用情報技術者試験" },
  { card: { title: "稼働率", sub: "MTBF÷(MTBF+MTTR)" },
    text: "【3分用語】稼働率\n\nシステムが正常に動いている時間の割合。MTBF÷(MTBF+MTTR) で計算。MTBF=平均故障間隔、MTTR=平均修理時間。\n\n#基本情報技術者試験" },
  { card: { title: "スループット", sub: "単位時間あたりの処理量" },
    text: "【3分用語】スループット\n\n単位時間あたりに処理できる仕事量＝システムの“実効的な処理能力”。応答時間（レスポンスタイム）とは別物。\n\n#基本情報技術者試験" },
  { card: { title: "NAT と NAPT", sub: "1対1か、複数共有か" },
    text: "【まぎらわしい】NAT と NAPT\n\nNAT：IPアドレスを1対1で変換\nNAPT：ポート番号も使って“複数”を1つのグローバルIPで共有（IPマスカレード）\n\n#基本情報技術者試験 #応用情報技術者試験" },
  { card: { title: "共通鍵 と 公開鍵", sub: "同じ鍵か、別の鍵か" },
    text: "【まぎらわしい】共通鍵暗号 と 公開鍵暗号\n\n共通鍵：暗号化も復号も同じ鍵（速いが鍵配送が課題）\n公開鍵：別々の鍵（遅いが安全に配れる）\n\n#応用情報技術者試験" },
  { card: { title: "認証 と 認可", sub: "本人確認か、権限付与か" },
    text: "【まぎらわしい】認証 と 認可\n\n認証(Authentication)：誰かを確かめる＝本人確認\n認可(Authorization)：何を許すか決める＝権限付与\n\n#応用情報技術者試験 #基本情報技術者試験" },
  { card: { title: "TCP と UDP", sub: "確実さか、速さか" },
    text: "【まぎらわしい】TCP と UDP\n\nTCP：確実だが遅め（再送あり・順序保証）\nUDP：速いが保証なし（動画・音声・ゲーム向き）\n\n#基本情報技術者試験" },
  { card: { title: "スタック と キュー", sub: "LIFO か、FIFOか" },
    text: "【まぎらわしい】スタック と キュー\n\nスタック：後入れ先出し（LIFO）\nキュー：先入れ先出し（FIFO）\n\n#基本情報技術者試験 #ITパスポート" },
  { card: { title: "リスク回避 と 低減", sub: "やめるか、小さくするか" },
    text: "【まぎらわしい】リスク回避 と リスク低減\n\n回避：リスク源そのものをやめる\n低減：発生確率や影響を小さくする\n\n#応用情報技術者試験 #ITパスポート" },
];
function pickExplainPost() {
  const day = Math.floor(Date.now() / 86400000);
  const item = EXPLAIN_POSTS[day % EXPLAIN_POSTS.length];
  return { ...item, reply: EXPLAIN_REPLY };
}

// その日のデイリー問題を決定的に取得（朝の出題・夜の答え合わせで同じ問題を使うため）
async function fetchDailyQuestion(sb, day) {
  const { data, error } = await sb.rpc("get_daily_question", { p_day: day });
  if (error || !data || !data.length) return null;
  return data[0];
}

// 朝の投稿（夜の答え合わせのリプ先ツイートID）を取得
async function getDailyPost(sb, day) {
  const { data, error } = await sb.rpc("get_daily_post", { p_day: day });
  if (error || !data || !data.length) return null;
  return data[0];
}

// ID指定で問題を取得（夜の答え合わせは朝に記録した問題そのものを答える）
async function fetchQuestionById(sb, id) {
  const { data } = await sb.from("questions").select("*").eq("id", id).maybeSingle();
  return data || null;
}

// 「今朝の答え合わせ」投稿（正解＋解説＋カード＋/qリンク）を組み立てる
const KANA_OPT = ["ア", "イ", "ウ", "エ"];
function buildAnswerPost(q) {
  const e = EXAMS[q.exam_id] || { name: "", tag: "" };
  const idx = { a: 0, b: 1, c: 2, d: 3 }[String(q.correct_answer || "").toLowerCase()] ?? 0;
  const kana = KANA_OPT[idx];
  const optText = q[`option_${["a", "b", "c", "d"][idx]}`] || "";
  const head = `【今朝の答え合わせ】\n\n今朝の${e.name}の問題、正解は【${kana}】でした。\n\n`;
  const tail = `\n\n${e.tag} 出典:IPA`;
  const budget = 270 - (weight(head) + weight(tail));
  const exp = trimToWeight((q.explanation || "").replace(/\s+/g, " ").trim(), Math.max(40, budget));
  return {
    text: `${head}${exp}${tail}`,
    card: { title: `正解は ${kana}`, sub: truncChars(optText, 24) },
    reply: `👉 解説の続き・類題を解く\nhttps://kakomon-dojo.com/q/${q.id}`,
  };
}

// 画像カード付きツイート（本文＋ブランド画像＋リプにリンク）。画像失敗時はテキストのみで投稿。
async function postCardTweet(client, item, inReplyToId = null) {
  let mediaId = null;
  try {
    const png = renderPrCard(item.card);
    mediaId = await client.v1.uploadMedia(png, { mimeType: "image/png" });
  } catch (e) {
    console.warn("画像の生成/アップロードに失敗。テキストのみで投稿します:", e?.message || e);
  }
  const headPayload = mediaId ? { text: item.text, media: { media_ids: [mediaId] } } : { text: item.text };
  if (inReplyToId) headPayload.reply = { in_reply_to_tweet_id: inReplyToId };
  const head = await client.v2.tweet(headPayload);
  const headId = head?.data?.id;
  let replyId = null;
  if (headId && item.reply) {
    const reply = await client.v2.tweet({ text: item.reply, reply: { in_reply_to_tweet_id: headId } });
    replyId = reply?.data?.id;
  }
  return { headId, replyId, hasImage: !!mediaId };
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
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  // 朝(出題)と夜(答え合わせ)で同じ問題を使うため、JSTの日付で「その日の問題」を決める
  const jstDay = Math.floor((Date.now() + 9 * 3600 * 1000) / 86400000);

  // ── 夜：今朝の問題の答え合わせ（POST_TYPE=explain）／ サービスPR（手動・POST_TYPE=pr）──
  if (type === "explain" || type === "pr") {
    let item;
    let replyToId = null; // 答え合わせは朝の投票ツイートへのリプ（スレッド）にする
    if (type === "pr") {
      item = pickPrPost();
    } else {
      // 朝に記録した「その日の問題」を、朝の投票ツイートへのリプ（スレッド）で答え合わせ
      const morning = await getDailyPost(sb, jstDay);
      const q = morning?.question_id ? await fetchQuestionById(sb, morning.question_id) : null;
      if (q && morning?.tweet_id) {
        item = buildAnswerPost(q);
        replyToId = morning.tweet_id;
      } else {
        item = pickExplainPost(); // 朝の記録が無い日は汎用解説にフォールバック（誤投稿防止）
      }
    }
    if (!hasCreds) {
      console.log(`=== ドライラン（${type}・X認証なし）===`);
      console.log("【本文】\n" + item.text);
      console.log("【リプライ】\n" + item.reply);
      console.log("【画像カード】", JSON.stringify(item.card));
      console.log("【スレッド先】", replyToId || "(なし＝単独投稿)");
      console.log(`--- 本文 weighted: ${weight(item.text)} / 280 ---`);
      return;
    }
    const r = await postCardTweet(newClient(), item, replyToId);
    console.log(`${type}投稿成功:`, r.headId, "リプ:", r.replyId, r.hasImage ? "(画像あり)" : "(画像なし)", replyToId ? "(スレッド)" : "");
    return;
  }

  // ── 朝：今日の1問（その日のデイリー問題をアンケートで出題：POST_TYPE=question）──
  const q = (await fetchDailyQuestion(sb, jstDay)) || (await pickQuestion(sb));
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
  let replyId = null;
  if (pollId) {
    // 夜の答え合わせを朝の投票へのスレッドにするため、ツイートIDを記録（best-effort）
    try {
      await sb.rpc("record_daily_post", { p_day: jstDay, p_question_id: q.id, p_tweet_id: pollId, p_exam: q.exam_id });
    } catch (e) {
      console.warn("record_daily_post に失敗（答え合わせは単独投稿になります）:", e?.message || e);
    }
    // ②その投稿への1個目のリプライにリンク（リンクペナルティ回避＋導線）
    const reply = await client.v2.tweet({ text: replyText, reply: { in_reply_to_tweet_id: pollId } });
    replyId = reply?.data?.id;
  }
  console.log("投稿成功:", pollId, "リプ:", replyId, "/", q.exam_id, q.year, "問", q.q_number);
}

main().catch((e) => { console.error("投稿失敗:", e?.message || e); process.exit(1); });
