"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

// 【2026-08-26 ボット対策】
// 以前はページを開いただけで無条件に signInAnonymously() していたため、
// クローラ/ボットの巡回でも匿名アカウントが量産され、Supabaseの無料枠(MAU)を圧迫していた
// （実測: 生涯セッション1,006件に対し13,836件がボット起因）。
// 対策として「実際に人が操作したとき」に初めて匿名認証を行う遅延実行に変更。
// pointerdown / keydown / touchstart はボットが通常発火させないため、人の操作の判定に使う。
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const EVENTS: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    let started = false;

    const onInteract = () => {
      if (started) return;
      started = true;
      EVENTS.forEach((e) => window.removeEventListener(e, onInteract));

      // 既存セッションがあれば復元のみ、無ければ匿名アカウントを作成
      const supabase = createSupabaseBrowserClient();
      supabase.auth
        .getUser()
        .then(({ data: { user } }) => {
          if (!user) return supabase.auth.signInAnonymously();
        })
        .catch(() => {});
    };

    EVENTS.forEach((e) => window.addEventListener(e, onInteract, { passive: true }));
    return () => EVENTS.forEach((e) => window.removeEventListener(e, onInteract));
  }, []);

  return <>{children}</>;
}
