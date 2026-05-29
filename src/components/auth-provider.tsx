"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function initAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // 未ログインなら匿名ログイン
        await supabase.auth.signInAnonymously();
      }
    }

    initAuth();
  }, []);

  return <>{children}</>;
}
