"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { UserPlus, CircleUserRound } from "lucide-react";

// トップのヘッダーに置く、ログイン状態に応じて表示が変わるボタン。
export function AccountLink() {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const check = (u: { is_anonymous?: boolean; email?: string } | null) =>
      setIsMember(!!u && !u.is_anonymous && !!u.email);
    supabase.auth.getUser().then(({ data }) => check(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      check(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (isMember) {
    return (
      <Link
        href="/account"
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs md:text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
      >
        <CircleUserRound className="w-3.5 h-3.5" />
        ログイン中
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs md:text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
    >
      <UserPlus className="w-3.5 h-3.5" />
      会員登録 / ログイン
    </Link>
  );
}
