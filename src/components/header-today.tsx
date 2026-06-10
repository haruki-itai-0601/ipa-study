"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Flame } from "lucide-react";

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

      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
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

  // 連続0日の表示はモチベーションを下げるだけなので、1日以上のときだけ出す
  if (!ready || streak === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs md:text-sm font-bold text-orange-600">
      <Flame className="w-3.5 h-3.5 md:w-4 md:h-4" />
      連続{streak}日
    </span>
  );
}
