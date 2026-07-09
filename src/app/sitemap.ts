import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { exams } from "@/lib/exams";

// 1日ごとに再生成（新しい問題が増えたら自動で反映される）
export const revalidate = 86400;

const BASE = "https://kakomon-labo.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/reform-2027`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/advanced`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/challenge`, changeFrequency: "weekly", priority: 0.6 },
  ];

  // 2027年開始の新試験。/exam/[id] は /learn/[id] へリダイレクトするため、
  // sitemapには実体である学習ハブ（/learn）の方を載せる。
  const NEW_EXAM_IDS = ["dm", "pd-m", "pd-d", "pd-s"];

  // 試験区分ページ（トップ＋演習メニュー）
  for (const e of exams) {
    if (!NEW_EXAM_IDS.includes(e.id)) {
      entries.push({ url: `${BASE}/exam/${e.id}`, changeFrequency: "weekly", priority: 0.9 });
    }
    entries.push({ url: `${BASE}/exam/${e.id}/past`, changeFrequency: "weekly", priority: 0.8 });
  }

  // 学習ハブ（新試験はここが検索の入口）
  const LEARN_HUB_IDS = ["ip", "fe", "ap", "sc", ...NEW_EXAM_IDS];
  for (const id of LEARN_HUB_IDS) {
    entries.push({
      url: `${BASE}/learn/${id}`,
      changeFrequency: "weekly",
      priority: NEW_EXAM_IDS.includes(id) ? 0.9 : 0.7,
    });
  }

  // 用語集・AI合格診断（登録不要の入口ページ）
  entries.push({ url: `${BASE}/learn/glossary`, changeFrequency: "weekly", priority: 0.7 });
  for (const id of ["ip", "fe", "ap"]) {
    entries.push({ url: `${BASE}/shindan/${id}`, changeFrequency: "monthly", priority: 0.7 });
  }

  // 全問題ページ（/q/[id]）＝1万件超のロングテールSEO資産
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("questions")
        .select("id")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const r of data) {
        entries.push({
          url: `${BASE}/q/${r.id}`,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
      if (data.length < PAGE) break;
    }
  } catch {
    // 問題一覧の取得に失敗しても、主要ページだけのsitemapを返す
  }

  return entries;
}
