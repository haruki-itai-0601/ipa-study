"use client";

// 設定タブ。アカウント（ログイン/ログアウト・あいさつ）、Pro案内、試験日設定を集約。
// モバイルの下タブ「設定」から開く。デスクトップは従来どおりサイドバー/各ページで完結。

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { basicExams } from "@/lib/exams";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getExamDate, fmtDateJst } from "@/lib/streak";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { CalendarDays, ChevronRight, Crown, LogIn, LogOut, Sparkles, User } from "lucide-react";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", brand: "#1D4ED8", brandSoft: "#EAF0FE", brandDeep: "#163FB0", dark: "#0E1B33",
  good: "#0F8A5F", goodSoft: "#E3F4EC",
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);

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
      setIsPremium(sub?.status === "active" && (!sub.current_period_end || new Date(sub.current_period_end) > new Date()));
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

  const row = "flex items-center gap-3 rounded-2xl p-4";
  const rowStyle = { background: C.card, border: `1px solid ${C.line}` };

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-20 border-b md:hidden" style={{ background: "rgba(255,255,255,0.92)", borderColor: C.line, backdropFilter: "blur(10px)" }}>
        <div className="px-4 py-3 text-[16px] font-bold">設定</div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-24 pt-4">
        {/* あいさつ＋アカウント */}
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

        {/* Pro */}
        <div className="mt-3">
          {isPremium ? (
            <div className={row} style={{ background: C.goodSoft, border: `1px solid #BFE6D2` }}>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: "#fff", color: C.good }}>
                <Crown className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold" style={{ color: C.good }}>プレミアム会員</div>
                <div className="text-[12.5px]" style={{ color: "#3a4658" }}>午後AI採点・詳細分析が使い放題</div>
              </div>
            </div>
          ) : (
            <Link href="/premium" className={row} style={{ background: C.dark }}>
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
        </div>

        {/* 試験日 */}
        <div className="mt-3 rounded-2xl p-4" style={rowStyle}>
          <button onClick={() => setEditingDate((v) => !v)} className="flex w-full items-center gap-3 text-left">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: C.brandSoft, color: C.brand }}>
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">試験日</span>
              <span className="block text-[12.5px]" style={{ color: C.muted }}>
                {examDate ? `本番：${examDate.replace(/-/g, "/")}` : "未設定（設定すると本番までの残り日数を表示）"}
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
                  <button onClick={() => { saveExamDate(null); setEditingDate(false); }} className="font-medium" style={{ color: "#DC2626" }}>削除</button>
                  <button onClick={() => setEditingDate(false)} className="rounded-md px-3 py-1 font-bold text-white" style={{ background: C.brand }}>完了</button>
                </div>
              </div>
            );
          })()}
        </div>

        <p className="mt-6 text-center text-[11.5px]" style={{ color: C.faint }}>
          {loading ? "" : "過去問演習ラボ"}
        </p>
      </main>

      <MobileTabBar />
    </div>
  );
}
