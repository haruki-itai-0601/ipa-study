"use client";

import { useEffect, useState } from "react";
import type { User, EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle2, LogOut, ShieldCheck, KeyRound } from "lucide-react";

type Phase = "email" | "code";

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
      setInfo(`${email} 宛に6桁の確認コードを送りました。`);
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
            <span className="font-semibold">{email}</span> に届いた6桁の数字を入力してください。
            （メールが見当たらない場合は迷惑メールフォルダもご確認ください）
          </p>
          <form onSubmit={handleVerify} className="space-y-3">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-2xl tracking-[0.4em] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

  // メール入力（初期）
  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="p-5 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">メールアドレスで会員登録 / ログイン</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            メールアドレスを入力すると6桁の確認コードが届きます。コードを入力するだけで登録完了です（パスワード不要）。
            今の学習進捗はそのまま引き継がれます。
          </p>
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
          {err && <p className="text-sm text-red-600">{err}</p>}
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
