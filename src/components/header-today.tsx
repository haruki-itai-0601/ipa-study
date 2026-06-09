"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Flame, Target } from "lucide-react";

// ヘッダーに表示する「連続日数」と「今日の目標(N/10問)」。
export function HeaderToday() {
  const [streak, setStreak] = useState(0);
  const [todayAnswered, setTodayAnswered] = useState(0);
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

      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const dayMs = 24 * 60 * 60 * 1000;
      const todayJST = new Date(
        Math.floor((now.getTime() + jstOffset) / dayMs) * dayMs - jstOffset
      );

      // 今日の解答数（目標バー用）
      const { data: todayData } = await supabase
        .from("user_progress")
        .select("answered_at")
        .eq("user_id", user.id)
        .gte("answered_at", todayJST.toISOString());
      setTodayAnswered(todayData?.length ?? 0);

      // 連続日数
      const { data: allData } = await supabase
        .from("user_progress")
        .select("answered_at")
        .eq("user_id", user.id)
        .order("answered_at", { ascending: false });
      let s = 0;
      if (allData && allData.length > 0) {
        const days = new Set(
          allData.map((x) => {
            const d = new Date(new Date(x.answered_at).getTime() + jstOffset);
            return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
          })
        );
        const checkDate = new Date(now.getTime() + jstOffset);
        const todayKey = `${checkDate.getUTCFullYear()}-${checkDate.getUTCMonth()}-${checkDate.getUTCDate()}`;
        if (!days.has(todayKey)) checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        while (true) {
          const key = `${checkDate.getUTCFullYear()}-${checkDate.getUTCMonth()}-${checkDate.getUTCDate()}`;
          if (days.has(key)) {
            s++;
            checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          } else break;
        }
      }
      setStreak(s);
      setReady(true);
    }
    load();
  }, []);

  if (!ready) return null;

  const goal = 10;
  const reached = todayAnswered >= goal;
  const pct = Math.min(100, (todayAnswered / goal) * 100);

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs md:text-sm font-bold text-orange-600">
        <Flame className="w-3.5 h-3.5 md:w-4 md:h-4" />
        連続{streak}日
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs md:text-sm font-bold ${
          reached
            ? "border-green-200 bg-green-50 text-green-600"
            : "border-indigo-200 bg-indigo-50 text-indigo-600"
        }`}
      >
        <Target className="w-3.5 h-3.5 md:w-4 md:h-4" />
        今日 {todayAnswered}/{goal}
        <span className="hidden sm:inline-block w-10 h-1.5 rounded-full bg-white/70 overflow-hidden align-middle">
          <span
            className={`block h-full ${reached ? "bg-green-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
    </div>
  );
}
