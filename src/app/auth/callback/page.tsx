"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

// OAuth（Google等）から戻ってくる着地点。
// @supabase/ssr のブラウザクライアントが URL の ?code= を自動でセッションに交換するので、
// ここでは完了を待って /account へ送るだけ。
export default function AuthCallbackPage() {
  const [message, setMessage] = useState("ログイン処理中です…");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // プロバイダ側からエラーで戻ってきた場合（例：既に別アカウントに連携済み）
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errDesc = search.get("error_description") || hash.get("error_description");
    if (errDesc) {
      window.location.replace(`/account?oauth_error=${encodeURIComponent(errDesc)}`);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.location.replace("/account");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") finish();
    });

    // すでに交換済みでイベントが飛ばないケースのフォールバック
    const t = window.setTimeout(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user && !data.user.is_anonymous) {
        finish();
      } else {
        setMessage("ログインを完了できませんでした。もう一度お試しください。");
        window.setTimeout(() => window.location.replace("/account"), 1800);
      }
    }, 3000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 mx-auto rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
