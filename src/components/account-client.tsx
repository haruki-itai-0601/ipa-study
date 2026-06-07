"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle2, LogOut, ShieldCheck } from "lucide-react";

export function AccountClient({ initialStatus }: { initialStatus?: string }) {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const isMember = !!user && !user.is_anonymous && !!user.email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    try {
      const { data } = await supabase.auth.getUser();
      const cur = data.user;
      if (cur?.is_anonymous) {
        // 匿名ユーザーにメールを紐付けて「会員」に昇格（学習進捗はそのまま引き継がれる）
        const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
        if (error) {
          // すでに使われているメールなどの場合は、その既存アカウントへのログインに切替
          const { error: e2 } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          });
          if (e2) throw e2;
        }
      } else {
        // 別端末などからのログイン
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
      }
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    // ログアウト後も学習記録を続けられるよう、再び匿名ログインしてトップへ
    await supabase.auth.signInAnonymously();
    window.location.href = "/";
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">読み込み中…</div>;
  }

  // ログイン済み（会員）
  if (isMember) {
    return (
      <Card className="border-2 border-emerald-200 bg-emerald-50">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">ログイン中</span>
          </div>
          <p className="text-sm text-gray-700">
            メールアドレス：<span className="font-semibold">{user?.email}</span>
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            学習進捗はこのアカウントに保存されています。別の端末でも同じメールアドレスでログインすると、進捗を引き継げます。
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </CardContent>
      </Card>
    );
  }

  // 送信完了
  if (sent) {
    return (
      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardContent className="p-5 space-y-2 text-center">
          <Mail className="w-8 h-8 text-indigo-600 mx-auto" />
          <p className="font-bold text-gray-900">確認メールを送信しました</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-semibold">{email}</span> 宛のメールに記載のリンクを開くと、登録／ログインが完了します。
            <br />
            （メールが届かない場合は迷惑メールフォルダもご確認ください）
          </p>
          <button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="text-xs text-indigo-600 hover:underline mt-1"
          >
            別のメールアドレスで登録する
          </button>
        </CardContent>
      </Card>
    );
  }

  // 未登録（フォーム）
  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="p-5 space-y-4">
        {initialStatus === "error" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            リンクの有効期限が切れているか、無効です。お手数ですが、もう一度登録してください。
          </p>
        )}
        <div>
          <h2 className="font-bold text-gray-900">メールアドレスで会員登録 / ログイン</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            メールアドレスを入力すると確認リンクが届きます。クリックするだけで登録完了です（パスワード不要）。
            今の学習進捗はそのまま引き継がれます。
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            <Mail className="w-4 h-4" />
            {busy ? "送信中…" : "確認メールを送る"}
          </button>
        </form>
        <p className="flex items-start gap-1.5 text-xs text-gray-400 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          メールアドレスは進捗の保存・ログインにのみ使用します。
        </p>
      </CardContent>
    </Card>
  );
}
