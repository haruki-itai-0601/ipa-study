"use client";

// 設定タブ。アカウント（あいさつ・ログイン/ログアウト）／学習（試験日）／プラン（Pro案内・解約）／
// サポート・情報（規約・プライバシー・特商法・お問い合わせ・バージョン）を集約。
// モバイルの下タブ「設定」から開く。デスクトップは従来どおりサイドバー/各ページで完結。

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getExamDate, fmtDateJst } from "@/lib/streak";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import {
  CalendarDays, ChevronRight, CreditCard, Crown, FileText, Loader2,
  LogIn, LogOut, Mail, ScrollText, Shield, Sparkles, User,
} from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", brandSoft: "#EAF0FE", brandDeep: "#163FB0", dark: "#0E1B33",
  good: "#0F8A5F", goodSoft: "#E3F4EC", bad: "#DC2626",
};

const APP_VERSION = "1.0.0";
const CONTACT_MAIL = "haruki.itai.200601@gmail.com"; // 特商法ページ掲載の問い合わせ先

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 mt-5 px-1 text-[11.5px] font-bold tracking-wide" style={{ color: C.muted }}>{children}</div>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setExamDate(getExamDate());
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) { setIsGuest(true); setLoading(false); return; }
      setIsGuest(false);
      const meta = user.user_metadata ?? {};
      setName((meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || "あなた");
      setEmail(user.email ?? "");
      const { data: sub } = await supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).maybeSingle();
      const active = sub?.status === "active" && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      setIsPremium(!!active);
      setPeriodEnd(sub?.current_period_end ?? null);
      setLoading(false);
    })();
  }, []);

  function saveExamDate(v: string | null) {
    const next: Record<string, string> = {};
    if (v) for (const e of basicExams) next[e.id] = v;
    try { localStorage.setItem("examDates", JSON.stringify(next)); } catch {}
    setExamDate(v);
  }

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  // Stripe カスタマーポータル（支払い方法変更・解約）を開く
  async function openPortal() {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) { setErr(data?.error ?? "お支払い管理ページを開けませんでした"); setBusy(false); return; }
      window.location.href = data.url;
    } catch {
      setErr("通信エラーが発生しました"); setBusy(false);
    }
  }

  const rowStyle = { background: C.card, border: `1px solid ${C.line}` };

  const legalLinks: { label: string; href: string; icon: typeof FileText; mail?: boolean }[] = [
    { label: "利用規約", href: "/legal/terms", icon: FileText },
    { label: "プライバシーポリシー", href: "/legal/privacy", icon: Shield },
    { label: "特定商取引法に基づく表記", href: "/legal/tokushoho", icon: ScrollText },
    { label: "お問い合わせ", href: `mailto:${CONTACT_MAIL}`, icon: Mail, mail: true },
  ];

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-20 border-b md:hidden" style={{ background: "rgba(255,255,255,0.92)", borderColor: C.line, backdropFilter: "blur(10px)" }}>
        <div className="px-4 py-3 text-[16px] font-bold">設定</div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-24 pt-3">
        <SectionLabel>アカウント</SectionLabel>
        <div className="rounded-2xl p-4" style={rowStyle}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[17px] font-bold" style={{ background: C.brandSoft, color: C.brandDeep }}>
              {isGuest ? <User className="h-6 w-6" /> : (name || "あ").charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold">こんにちは、{isGuest ? "ゲスト" : name}さん</div>
              <div className="truncate text-[12.5px]" style={{ color: C.muted }}>
                {isGuest ? "未ログイン（進捗はこの端末のみ）" : email}
              </div>
            </div>
          </div>
          {isGuest ? (
            <Link href="/account" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-bold text-white" style={{ background: C.brand }}>
              <LogIn className="h-5 w-5" /> ログイン・新規登録
            </Link>
          ) : (
            <button onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold" style={{ background: "#F1F4F9", color: C.muted }}>
              <LogOut className="h-4 w-4" /> ログアウト
            </button>
          )}
        </div>
        {isGuest && (
          <p className="mt-2 px-1 text-[12px] leading-relaxed" style={{ color: C.muted }}>
            会員登録すると、機種変更や別の端末でも同じメールで学習進捗を引き継げます。
          </p>
        )}

        <SectionLabel>学習</SectionLabel>
        <div className="rounded-2xl p-4" style={rowStyle}>
          <button onClick={() => setEditingDate((v) => !v)} className="flex w-full items-center gap-3 text-left">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: C.brandSoft, color: C.brand }}>
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">試験日</span>
              <span className="block text-[12.5px]" style={{ color: C.muted }}>
                {examDate ? `本番：${examDate.replace(/-/g, "/")} ・ 変更はこちら` : "試験日の設定はこちらから"}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 flex-none" style={{ color: C.faint, transform: editingDate ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
          </button>
          {editingDate && (() => {
            const cur = examDate || fmtDateJst(new Date());
            const [y, m, d] = cur.split("-").map(Number);
            const thisYear = new Date().getFullYear();
            const apply = (ny: number, nm: number, nd: number) => {
              const maxD = new Date(ny, nm, 0).getDate();
              saveExamDate(`${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(nd, maxD)).padStart(2, "0")}`);
            };
            const sel = "rounded-lg border bg-white px-2 py-2 text-[14px]";
            return (
              <div className="mt-3 border-t pt-3" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2">
                  <select value={y} onChange={(e) => apply(+e.target.value, m, d)} className={sel} style={{ borderColor: C.line }}>
                    {[thisYear, thisYear + 1, thisYear + 2].map((yy) => (<option key={yy} value={yy}>{yy}年</option>))}
                  </select>
                  <select value={m} onChange={(e) => apply(y, +e.target.value, d)} className={sel} style={{ borderColor: C.line }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (<option key={mm} value={mm}>{mm}月</option>))}
                  </select>
                  <select value={d} onChange={(e) => apply(y, m, +e.target.value)} className={sel} style={{ borderColor: C.line }}>
                    {Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => i + 1).map((dd) => (<option key={dd} value={dd}>{dd}日</option>))}
                  </select>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[12.5px]">
                  <button onClick={() => { saveExamDate(null); setEditingDate(false); }} className="font-medium" style={{ color: C.bad }}>削除</button>
                  <button onClick={() => setEditingDate(false)} className="rounded-md px-3 py-1 font-bold text-white" style={{ background: C.brand }}>完了</button>
                </div>
              </div>
            );
          })()}
        </div>

        <SectionLabel>プラン</SectionLabel>
        {isPremium ? (
          <div className="rounded-2xl p-4" style={{ background: C.goodSoft, border: "1px solid #BFE6D2" }}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: "#fff", color: C.good }}>
                <Crown className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold" style={{ color: C.good }}>プレミアム会員</div>
                <div className="text-[12.5px]" style={{ color: "#3a4658" }}>
                  午後AI採点・詳細分析が使い放題{periodEnd ? `・次回更新 ${periodEnd.slice(0, 10).replace(/-/g, "/")}` : ""}
                </div>
              </div>
            </div>
            <button onClick={openPortal} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[14px] font-bold disabled:opacity-60" style={{ color: C.ink, border: `1px solid #BFE6D2` }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} お支払い管理・解約
            </button>
            {err && <p className="mt-2 text-center text-[12px]" style={{ color: C.bad }}>{err}</p>}
          </div>
        ) : (
          <Link href="/premium" className="flex items-center gap-3 rounded-2xl p-4" style={{ background: C.dark }}>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-white">Proはこちら（月額980円）</div>
              <div className="text-[12.5px]" style={{ color: "#A9B6CC" }}>午後の記述をAIが○△×＋講評で採点</div>
            </div>
            <ChevronRight className="h-5 w-5 flex-none text-white/70" />
          </Link>
        )}

        <SectionLabel>サポート・情報</SectionLabel>
        <div className="overflow-hidden rounded-2xl" style={rowStyle}>
          {legalLinks.map((l, i) => {
            const inner = (
              <>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg" style={{ background: "#F1F4F9", color: C.muted }}>
                  <l.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 text-[14.5px] font-medium">{l.label}</span>
                <ChevronRight className="h-5 w-5 flex-none" style={{ color: C.faint }} />
              </>
            );
            const cls = "flex items-center gap-3 px-4 py-3.5";
            const st = i > 0 ? { borderTop: `1px solid ${C.line}` } : undefined;
            return l.mail ? (
              <a key={l.label} href={l.href} className={cls} style={st}>{inner}</a>
            ) : (
              <Link key={l.label} href={l.href} className={cls} style={st}>{inner}</Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11.5px]" style={{ color: C.faint }}>
          過去問演習ラボ ・ v{APP_VERSION}
        </p>
      </main>

      <MobileTabBar />
    </div>
  );
}
