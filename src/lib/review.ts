"use client";

// 間違いの復習：復習対象（一度でも間違え、まだ一度も正解していない問題）の抽出。
// 判定基準は分野学習ページ（/exam/[examId]/study）の弱点抽出と同じ＝後で正解した問題は除外。

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchAllRows } from "@/lib/supabase-fetch";

export type WrongPool = {
  loggedIn: boolean;
  ids: string[]; // 復習対象の question_id（最近間違えた順）
};

export async function fetchWrongPool(examId: string): Promise<WrongPool> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { loggedIn: false, ids: [] };

  const prog = await fetchAllRows<{ question_id: string; is_correct: boolean }>((from, to) =>
    supabase
      .from("user_progress")
      .select("question_id, is_correct")
      .eq("user_id", user.id)
      .eq("exam_id", examId)
      .order("answered_at", { ascending: false })
      .range(from, to)
  );

  const everCorrect = new Set<string>();
  for (const p of prog) {
    if (p.is_correct) everCorrect.add(p.question_id);
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const p of prog) {
    // 新しい順に走査しているので ids は「最近間違えた順」になる
    if (!p.is_correct && !everCorrect.has(p.question_id) && !seen.has(p.question_id)) {
      seen.add(p.question_id);
      ids.push(p.question_id);
    }
  }
  return { loggedIn: true, ids };
}
