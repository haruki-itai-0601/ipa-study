"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Flame } from "lucide-react";

// "YYYY-MM-DD" の前日を返す
function prevDate(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

// ヘッダーに表示する「連続日数」。
export function HeaderToday() {
  const [streak, setStreak] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }

      // 解答した日（JST・重複なし・新しい順）をDB側で集計（1000行上限の影響なし）
      const { data } = await supabase.rpc("get_answered_days_jst");
      const days = ((data as { day: string }[] | null) ?? []).map((r) => r.day);

      let s = 0;
      if (days.length > 0) {
        const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
        // 今日解いていなければ昨日起点で連続を数える
        let expect = days[0] === todayJst ? todayJst : prevDate(todayJst);
        for (const d of days) {
          if (d === expect) {
            s++;
            expect = prevDate(expect);
          } else {
            break;
          }
        }
      }
      setStreak(s);
      setReady(true);
    }
    load();
  }, []);

  // 連続0日の表示はモチベーションを下げるだけなので、1日以上のときだけ出す
  if (!ready || streak === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs md:text-sm font-bold text-orange-600">
      <Flame className="w-3.5 h-3.5 md:w-4 md:h-4" />
      連続{streak}日
    </span>
  );
}
