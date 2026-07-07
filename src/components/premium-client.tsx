"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PAYMENTS_ENABLED } from "@/lib/flags";
import { track } from "@/lib/track";
import {
  PREMIUM_PRICE_JPY,
  PREMIUM_PRICE_YEARLY_JPY,
  PREMIUM_YEARLY_PER_MONTH_JPY,
} from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles, CreditCard, LogIn, Loader2, Wrench } from "lucide-react";

type Plan = "monthly" | "yearly";

type Subscription = {
  status: string;
  plan: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

const FEATURES = [
  "AIレコメンド：弱点から「次にやるべき演習・学習法」をAIが提案",
  "応用情報の午後（記述式）をAIが○△×＋講評で採点",
  "記号・数値・短答の自動採点・過去問演習は引き続き無料",
  "いつでも解約OK（解約後も請求期間末まで利用可）",
];

export function PremiumClient() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [checkoutResult, setCheckoutResult] = useState<"success" | "cancel" | null>(null);
  const [plan, setPlan] = useState<Plan>("monthly");

  useEffect(() => {
    track("premium_view"); // プレミアム案内ページの閲覧
    // Checkout からの戻り（?checkout=success / cancel）を表示に反映
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      setCheckoutResult(checkout);
      if (checkout === "success") track("purchase_return"); // 決済完了で戻ってきた
      window.history.replaceState(null, "", "/premium");
    }

    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user);
      if (data.user) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status, plan, current_period_end, stripe_customer_id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (mounted) setSubscription(sub);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const isLoggedIn = !!user && !user.is_anonymous && !!user.email;
  const isActive =
    subscription?.status === "active" &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date());

  async function callApi(path: string, payload?: object) {
    if (path.includes("checkout")) {
      track("begin_checkout", {
        value: plan === "yearly" ? PREMIUM_PRICE_YEARLY_JPY : PREMIUM_PRICE_JPY,
        currency: "JPY",
      });
    } else if (path.includes("portal")) track("open_billing_portal");
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        ...(payload
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
          : {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setErr(data?.error ?? "処理に失敗しました。時間をおいて再度お試しください。");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr("通信エラーが発生しました。");
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">読み込み中…</div>;
  }

  // 決済直後の案内（Webhook反映に数秒かかることがある）
  if (checkoutResult === "success" && !isActive) {
    return (
      <Card className="border-2 border-emerald-200 bg-emerald-50">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">お申し込みありがとうございます！</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            決済が完了しました。会員情報の反映には数秒〜1分ほどかかる場合があります。
            反映されない場合はページを再読み込みしてください。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-4 py-2"
          >
            再読み込み
          </button>
        </CardContent>
      </Card>
    );
  }

  // 会員（active）
  if (isActive) {
    return (
      <Card className="border-2 border-violet-200 bg-violet-50/60">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-violet-700">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold">プレミアム会員です</span>
          </div>
          <p className="text-sm text-gray-700">
            AIレコメンドと、午後問題の記述式AI採点をご利用いただけます。
          </p>
          {subscription?.current_period_end && (
            <p className="text-xs text-gray-500">
              次回更新日：
              {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}
            </p>
          )}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg px-4 py-2"
            >
              問題を解く
            </Link>
            {subscription?.stripe_customer_id && (
              <button
                onClick={() => callApi("/api/stripe/portal")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                お支払い管理・解約
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 決済の一時停止中（本番審査・本番キー差し替えが完了するまで）。会員（active）は上で処理済みなので影響なし。
  if (!PAYMENTS_ENABLED) {
    return (
      <Card className="border-2 border-violet-200">
        <CardContent className="p-5 space-y-4">
          <PlanSummary plan={plan} setPlan={setPlan} />
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 space-y-1.5">
            <p className="flex items-center gap-1.5 font-bold text-amber-700">
              <Wrench className="w-4 h-4" /> ただいま準備中です
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              プレミアム会員のお申し込みは現在準備中です。近日中の公開に向けて調整しています。今しばらくお待ちください。
            </p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            記号・数値・短答の自動採点、過去問演習は引き続き無料でご利用いただけます。
          </p>
        </CardContent>
      </Card>
    );
  }

  // 未ログイン（または匿名）→ まず会員登録へ
  if (!isLoggedIn) {
    return (
      <Card className="border-2 border-violet-200">
        <CardContent className="p-5 space-y-4">
          <PlanSummary plan={plan} setPlan={setPlan} />
          <p className="text-sm text-gray-600 leading-relaxed">
            プレミアム登録には、先に無料の会員登録（ログイン）が必要です。
          </p>
          <Link
            href="/account?next=/premium"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-semibold hover:bg-indigo-700"
          >
            <LogIn className="w-4 h-4" />
            会員登録 / ログインへ
          </Link>
        </CardContent>
      </Card>
    );
  }

  // ログイン済みの非会員 → Checkout へ
  return (
    <Card className="border-2 border-violet-200">
      <CardContent className="p-5 space-y-4">
        <PlanSummary plan={plan} setPlan={setPlan} />
        {checkoutResult === "cancel" && (
          <p className="text-sm text-gray-500">お手続きはキャンセルされました。</p>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          onClick={() => callApi("/api/stripe/checkout", { plan })}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-base font-bold text-white shadow-md shadow-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {busy
            ? "決済ページへ移動中…"
            : plan === "yearly"
              ? `14日間無料ではじめる（その後 年額${PREMIUM_PRICE_YEARLY_JPY.toLocaleString()}円）`
              : `14日間無料ではじめる（その後 月額${PREMIUM_PRICE_JPY.toLocaleString()}円）`}
        </button>
        <p className="text-xs text-gray-400 leading-relaxed">
          14日間は無料です。14日間が過ぎると
          {plan === "yearly"
            ? `年額${PREMIUM_PRICE_YEARLY_JPY.toLocaleString()}円`
            : `月額${PREMIUM_PRICE_JPY.toLocaleString()}円`}
          が発生します（クレジットカード決済・Stripe）。トライアル中を含め、いつでも解約でき、解約後も請求期間の末日までご利用いただけます。
        </p>
      </CardContent>
    </Card>
  );
}

function PlanSummary({ plan, setPlan }: { plan: Plan; setPlan: (p: Plan) => void }) {
  const isYearly = plan === "yearly";
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg p-1.5">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-bold text-gray-900">プレミアム会員</h2>
        </div>

        {/* 月額 / 年額 トグル */}
        <div className="mt-2.5 inline-flex rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setPlan("monthly")}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
              !isYearly ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            月額
          </button>
          <button
            type="button"
            onClick={() => setPlan("yearly")}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
              isYearly ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            年額
            <span className="ml-1 text-emerald-600">2ヶ月分お得</span>
          </button>
        </div>

        <p className="mt-2">
          <span className="text-3xl font-extrabold text-gray-900">
            {(isYearly ? PREMIUM_PRICE_YEARLY_JPY : PREMIUM_PRICE_JPY).toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 font-semibold">{isYearly ? "円/年（税込）" : "円/月（税込）"}</span>
          {isYearly && (
            <span className="ml-2 text-xs font-semibold text-emerald-600">
              実質 約{PREMIUM_YEARLY_PER_MONTH_JPY}円/月
            </span>
          )}
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
          🎁 14日間無料・いつでも解約OK
        </p>
      </div>
      <ul className="space-y-1.5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-sm text-gray-700">
            <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400 leading-relaxed">
        ※AI採点はAIによる自動採点のため、判定・講評は参考情報です。実際の試験の採点基準とは異なる場合があります。
      </p>
    </div>
  );
}
