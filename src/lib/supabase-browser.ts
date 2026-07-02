import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Supabase/PostgREST は 1 リクエストあたり最大 1000 行しか返さないため、
// 1000 行を超えるテーブル（用語集など）は range でページングして全件取得する。
type LearnTermsFilter = { examId?: string };

export async function fetchLearnTerms<T = Record<string, unknown>>(
  columns: string,
  filter: LearnTermsFilter = {}
): Promise<T[]> {
  const supabase = createSupabaseBrowserClient();
  const pageSize = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from("learn_terms").select(columns).range(from, from + pageSize - 1);
    if (filter.examId) query = query.eq("exam_id", filter.examId);
    const { data, error } = await query;
    if (error || !data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
  }
  return all;
}
