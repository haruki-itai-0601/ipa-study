#!/usr/bin/env node
/**
 * 令和4年度 過去問スクレイピングスクリプト
 * 各試験の siken.com からデータを取得し、Supabase に INSERT する SQL を出力
 *
 * 実行: node scripts/scrape-r4.mjs > /tmp/r4_questions.sql
 */

const EXAMS = [
  { examId: "pm", site: "pm-siken.com", period: "04_aki", year: "令和4年度 秋期" },
  { examId: "sc", site: "sc-siken.com", period: "04_aki", year: "令和4年度 秋期" },
  { examId: "sc", site: "sc-siken.com", period: "04_haru", year: "令和4年度 春期" },
  { examId: "db", site: "db-siken.com", period: "04_aki", year: "令和4年度 秋期" },
  { examId: "au", site: "au-siken.com", period: "04_aki", year: "令和4年度 秋期" },
  { examId: "nw", site: "nw-siken.com", period: "04_haru", year: "令和4年度 春期" },
  { examId: "st", site: "st-siken.com", period: "04_haru", year: "令和4年度 春期" },
  { examId: "sa", site: "sa-siken.com", period: "04_haru", year: "令和4年度 春期" },
  { examId: "sm", site: "sm-siken.com", period: "04_haru", year: "令和4年度 春期" },
];

const ANSWER_MAP = { "ア": "a", "イ": "b", "ウ": "c", "エ": "d" };

function stripTags(s) {
  return (s || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function escape(s) {
  return (s || "").replace(/'/g, "''");
}

function parseQuestion(html) {
  const mondai = (html.match(/<div id="mondai">([\s\S]*?)<\/div>/) || [])[1];
  const optA   = (html.match(/<span id="select_a">([\s\S]*?)<\/span>/) || [])[1];
  const optI   = (html.match(/<span id="select_i">([\s\S]*?)<\/span>/) || [])[1];
  const optU   = (html.match(/<span id="select_u">([\s\S]*?)<\/span>/) || [])[1];
  const optE   = (html.match(/<span id="select_e">([\s\S]*?)<\/span>/) || [])[1];
  const ans    = (html.match(/<span id="answerChar">(.*?)<\/span>/) || [])[1];
  const catRaw = (html.match(/<h3>分類 :<\/h3>\s*<div>([\s\S]*?)<\/div>/) || [])[1];
  const kaisetsu = (html.match(/id="kaisetsu"[^>]*>([\s\S]*?)<\/div>/) || [])[1];

  const category = catRaw
    ? stripTags(catRaw.split("&raquo;").pop())
    : "";

  return {
    question:      stripTags(mondai),
    option_a:      stripTags(optA),
    option_b:      stripTags(optI),
    option_c:      stripTags(optU),
    option_d:      stripTags(optE),
    correct_answer: ANSWER_MAP[(ans || "").trim()] || "a",
    category,
    explanation:   stripTags(kaisetsu),
  };
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; IPA-Study-Bot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function scrapeExam(exam) {
  const { examId, site, period, year } = exam;
  const results = [];

  // 5問ずつ並列取得
  for (let batch = 0; batch < 5; batch++) {
    const nums = [1,2,3,4,5].map(i => batch * 5 + i);
    const pages = await Promise.all(
      nums.map(async (n) => {
        const url = `https://www.${site}/kakomon/${period}/am2_${n}.html`;
        try {
          const html = await fetchPage(url);
          return { n, html };
        } catch (e) {
          process.stderr.write(`  SKIP ${url}: ${e.message}\n`);
          return null;
        }
      })
    );

    for (const page of pages) {
      if (!page) continue;
      const q = parseQuestion(page.html);
      if (!q.question) {
        process.stderr.write(`  WARN: empty question at 問${page.n}\n`);
        continue;
      }
      results.push({ ...q, examId, year });
    }

    // バッチ間に少し待機
    if (batch < 4) await new Promise(r => setTimeout(r, 300));
  }

  return results;
}

function toSQL(q) {
  return `INSERT INTO questions (exam_id, type, category, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, year) VALUES ('${q.examId}', 'past', '${escape(q.category)}', '${escape(q.question)}', '${escape(q.option_a)}', '${escape(q.option_b)}', '${escape(q.option_c)}', '${escape(q.option_d)}', '${q.correct_answer}', '${escape(q.explanation)}', 'medium', '${q.year}');`;
}

async function main() {
  process.stderr.write("=== 令和4年度 過去問スクレイピング開始 ===\n");

  for (const exam of EXAMS) {
    process.stderr.write(`\n[${exam.examId.toUpperCase()} ${exam.year}] 取得中...\n`);
    const questions = await scrapeExam(exam);
    process.stderr.write(`  → ${questions.length}問 取得完了\n`);
    for (const q of questions) {
      process.stdout.write(toSQL(q) + "\n");
    }
  }

  process.stderr.write("\n=== 完了 ===\n");
}

main().catch(e => {
  process.stderr.write(`ERROR: ${e.message}\n`);
  process.exit(1);
});
