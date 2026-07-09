"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User, EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/track";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle2, LogOut, ShieldCheck, KeyRound, Home } from "lucide-react";

type Phase = "email" | "code";

// Google公式カラーの「G」ロゴ
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function AccountClient() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  // 匿名ユーザーのメール昇格は 'email_change'、新規/別端末ログインは 'email'
  const [otpType, setOtpType] = useState<EmailOtpType>("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  // Google連携が「既に別アカウントで使用中」だった場合、次回クリックは通常ログインに切替
  const [googleAsSignIn, setGoogleAsSignIn] = useState(false);

  // OAuthコールバックからエラーで戻ってきた場合の表示
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthErr = params.get("oauth_error");
    if (!oauthErr) return;
    if (/already|exist|linked/i.test(oauthErr)) {
      setErr(
        "このGoogleアカウントは既に登録済みです。もう一度「Googleでログイン」を押すと、そのアカウントでログインし直します。"
      );
      setGoogleAsSignIn(true);
    } else {
      setErr(`Googleログインでエラーが発生しました：${oauthErr}`);
    }
    // URLからエラーパラメータを消しておく
    window.history.replaceState(null, "", "/account");
  }, []);

  // プレミアム等から ?next=/... 付きで来た場合、会員になったら元の画面へ戻す（課金導線の取りこぼし防止）
  useEffect(() => {
    if (loading || !user || user.is_anonymous) return;
    const next = new URLSearchParams(window.location.search).get("next");
    // オープンリダイレクト対策：先頭スラッシュのみ許可。バックスラッシュ・制御文字は
    // ブラウザのURL正規化で "//" 相当になり外部サイトへ飛べるため拒否（/admin/login と同じガード）。
    if (next && next.startsWith("/") && !next.startsWith("//") && !/[\\\t\r\n]/.test(next)) {
      window.location.href = next;
    }
  }, [loading, user]);

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

  async function sendCode(targetEmail: string) {
    const { data } = await supabase.auth.getUser();
    const cur = data.user;
    if (cur?.is_anonymous) {
      // 匿名ユーザーにメールを紐付けて「会員」に昇格（学習進捗はそのまま引き継がれる）
      const { error } = await supabase.auth.updateUser({ email: targetEmail });
      if (error) {
        // すでに使われているメールなどの場合は、その既存アカウントへのログインに切替
        const { error: e2 } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: { shouldCreateUser: true },
        });
        if (e2) throw e2;
        setOtpType("email");
      } else {
        setOtpType("email_change");
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setOtpType("email");
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      await sendCode(email);
      setPhase("code");
      setInfo(`${email} 宛に確認コードを送りました。`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: otpType,
      });
      if (error) throw error;
      // 会員登録/ログイン成功（メール認証）。otpType='email_change'は匿名→会員昇格＝新規登録
      track(otpType === "email_change" ? "sign_up" : "account_login", { method: "email" });
      // 成功すると onAuthStateChange でログイン状態に切り替わる
    } catch {
      setErr("コードが正しくないか、有効期限が切れています。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      await sendCode(email);
      setInfo("確認コードを再送しました。");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "再送に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data } = await supabase.auth.getUser();
      const cur = data.user;
      if (cur?.is_anonymous && !googleAsSignIn) {
        // 匿名ユーザーにGoogleを紐付けて会員に昇格（学習進捗はそのまま引き継ぎ）
        const { error } = await supabase.auth.linkIdentity({
          provider: "google",
          options: { redirectTo },
        });
        if (error) {
          // 連携を開始できない場合は通常ログインに切替
          const { error: e2 } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
          });
          if (e2) throw e2;
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (error) throw error;
      }
      // 成功するとGoogleへリダイレクトされるため、ここには戻らない
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Googleログインを開始できませんでした。");
      setBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
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
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-2"
            >
              <Home className="w-4 h-4" />
              問題に戻る
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // コード入力
  if (phase === "code") {
    return (
      <Card className="border-2 border-indigo-200">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-indigo-700">
            <KeyRound className="w-5 h-5" />
            <span className="font-bold">確認コードを入力</span>
          </div>
          {info && <p className="text-sm text-gray-600">{info}</p>}
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold">{email}</span> に届いた確認コード（数字）を入力してください。
            （メールが見当たらない場合は迷惑メールフォルダもご確認ください）
          </p>
          <form onSubmit={handleVerify} className="space-y-3">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="------"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-2xl tracking-[0.25em] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "確認中…" : "ログイン / 登録する"}
            </button>
          </form>
          <div className="flex items-center justify-between text-xs">
            <button onClick={handleResend} disabled={busy} className="text-indigo-600 hover:underline disabled:opacity-50">
              コードを再送する
            </button>
            <button
              onClick={() => {
                setPhase("email");
                setCode("");
                setErr("");
                setInfo("");
              }}
              className="text-gray-500 hover:underline"
            >
              メールアドレスを変更
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 方法選択（初期）：Google または メール
  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="p-5 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">会員登録 / ログイン（無料）</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            登録すると学習進捗が保存され、機種変更・別端末でも引き継げます。
            いままで解いた進捗もそのまま引き継がれます（パスワード不要）。
          </p>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        {/* Googleでログイン */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
        >
          <GoogleG />
          {busy ? "リダイレクト中…" : "Googleでログイン / 登録"}
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          またはメールで
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSendEmail} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            <Mail className="w-4 h-4" />
            {busy ? "送信中…" : "確認コードを送る"}
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
