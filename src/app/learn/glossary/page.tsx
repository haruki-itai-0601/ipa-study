"use client";

// 用語集：3試験共通の1ページ（Reclaim AI風）。
// 五十音セクション＋検索＋試験レベル・分野フィルタ。用語行は行見出しから右へインデント。
// レベル = learn_terms.exam_id（初出試験: ip→IP, fe→FE, ap→AP）。
// /learn/glossary?exam=ip|fe|ap （入り口の試験でレベルを初期絞り込み）

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchLearnTerms } from "@/lib/supabase-browser";
import { ArrowLeft, Loader2, Search, SearchX } from "lucide-react";
import { BackToDashboard } from "@/components/back-to-dashboard";

const C = {
  bg: "#F5F7FA", card: "#FFFFFF", ink: "#15202E", muted: "#677488", faint: "#9AA6B6",
  line: "#E7EBF1", line2: "#DDE3EC", brand: "#1D4ED8", brandDeep: "#163FB0", brandSoft: "#EAF0FE",
};

type Term = { term: string; reading: string | null; category: string; body: string; exam_id: string };

const GYO = [
  { key: "a", label: "あ", chars: "あいうえおぁぃぅぇぉゔ" },
  { key: "ka", label: "か", chars: "かきくけこがぎぐげごゕゖ" },
  { key: "sa", label: "さ", chars: "さしすせそざじずぜぞ" },
  { key: "ta", label: "た", chars: "たちつてとだぢづでどっ" },
  { key: "na", label: "な", chars: "なにぬねの" },
  { key: "ha", label: "は", chars: "はひふへほばびぶべぼぱぴぷぺぽ" },
  { key: "ma", label: "ま", chars: "まみむめも" },
  { key: "ya", label: "や", chars: "やゆよゃゅょ" },
  { key: "ra", label: "ら", chars: "らりるれろ" },
  { key: "wa", label: "わ", chars: "わゐゑをん" },
] as const;

const LEVEL_RANK: Record<string, number> = { ip: 1, fe: 2, ap: 3 };
const LEVELS = [
  { id: "all", label: "すべて" },
  { id: "ip", label: "ITパスポート" },
  { id: "fe", label: "基本情報技術者" },
  { id: "ap", label: "応用情報技術者" },
];
const LEVEL_BADGE: Record<string, { bg: string; fg: string }> = {
  ip: { bg: "#EAF0FE", fg: "#163FB0" },
  fe: { bg: "#F3EEFC", fg: "#6D28D9" },
  ap: { bg: "#E1F1FD", fg: "#0C63A8" },
};

// カタカナ読みが混ざっても引けるよう、ひらがなに正規化して行を判定する
function toHiragana(s: string) {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
function rowKeyOf(t: Term): string {
  if (/^[A-Za-z0-9]/.test(t.term)) return "az";
  const ch = toHiragana(((t.reading ?? t.term) || "").trim()).charAt(0);
  for (const g of GYO) if (g.chars.includes(ch)) return g.key;
  return "az";
}

function GlossaryContent() {
  const searchParams = useSearchParams();
  const examParam = searchParams.get("exam");
  const validExam = examParam && LEVEL_RANK[examParam] ? examParam : null;
  const backHref = validExam ? `/learn/${validExam}` : "/learn/ip";

  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState(validExam ?? "all");
  const [cat, setCat] = useState("all");

  useEffect(() => {
    let on = true;
    (async () => {
      const data = await fetchLearnTerms<Term>("term, reading, category, body, exam_id");
      if (!on) return;
      setTerms(data);
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, []);

  const cats = useMemo(() => Array.from(new Set(terms.map((t) => t.category))).sort(), [terms]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return terms.filter(
      (t) =>
        (level === "all" || LEVEL_RANK[t.exam_id] <= LEVEL_RANK[level]) &&
        (cat === "all" || t.category === cat) &&
        (!s || t.term.toLowerCase().includes(s) || toHiragana(t.reading ?? "").includes(toHiragana(s)))
    );
  }, [terms, q, level, cat]);

  const sections = useMemo(() => {
    const map = new Map<string, Term[]>();
    for (const t of visible) {
      const k = rowKeyOf(t);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    for (const [k, list] of map) {
      if (k === "az") list.sort((a, b) => a.term.toLowerCase().localeCompare(b.term.toLowerCase(), "en"));
      else list.sort((a, b) => toHiragana(a.reading ?? a.term).localeCompare(toHiragana(b.reading ?? b.term), "ja"));
    }
    return map;
  }, [visible]);

  const rows = [...GYO.map((g) => ({ key: g.key as string, label: g.label as string })), { key: "az", label: "A–Z" }];

  function jumpTo(key: string) {
    document.getElementById(`gy-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function resetFilters() {
    setQ("");
    setLevel("all");
    setCat("all");
  }

  const chipStyle = (active: boolean) =>
    active
      ? { background: C.brand, color: "#fff" }
      : { background: "#EEF2F9", color: "#33415A" };

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-sans">
      <header className="sticky top-0 z-10 border-b" style={{ background: "rgba(255,255,255,0.8)", borderColor: C.line, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 md:px-6">
          <Link href={backHref} aria-label="戻る" style={{ color: C.faint }} className="hover:opacity-70">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <div className="text-[13px]" style={{ color: C.muted }}>学習する</div>
            <div className="truncate text-[17px] font-bold">用語集</div>
          </div>
          <BackToDashboard className="ml-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-7 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-bold">用語集</h1>
          <span className="rounded-full px-3 py-1 text-[12.5px] font-bold" style={{ background: C.brandSoft, color: C.brandDeep }}>
            3試験共通
          </span>
          <span className="ml-auto text-[13px]" style={{ color: C.muted }}>
            {loading ? "読み込み中…" : `表示 ${visible.length}語 / 全${terms.length}語`}
          </span>
        </div>
        <p className="mt-1.5 text-[14px]" style={{ color: C.muted }}>
          試験に出る用語を1ページで。検索・試験レベル・分野・五十音から探せます。
        </p>

        <div className="mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: C.card, border: `1px solid ${C.line2}` }}>
          <Search className="h-5 w-5 flex-none" style={{ color: C.faint }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="用語・読みで検索（例：あんごう）"
            className="w-full bg-transparent text-[15px] outline-none"
            style={{ color: C.ink }}
          />
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="w-[74px] flex-none text-[12.5px] font-bold" style={{ color: C.faint }}>試験レベル</span>
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className="rounded-full px-4 py-1.5 text-[13.5px] font-bold transition-colors"
              style={chipStyle(level === l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        {cats.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="w-[74px] flex-none text-[12.5px] font-bold" style={{ color: C.faint }}>分野</span>
            <button onClick={() => setCat("all")} className="rounded-full px-4 py-1.5 text-[13.5px] font-bold transition-colors" style={chipStyle(cat === "all")}>
              すべて
            </button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className="rounded-full px-4 py-1.5 text-[13.5px] font-bold transition-colors" style={chipStyle(cat === c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5 border-b pb-4" style={{ borderColor: C.line }}>
          {rows.map((r) => {
            const has = (sections.get(r.key)?.length ?? 0) > 0;
            return (
              <button
                key={r.key}
                onClick={() => has && jumpTo(r.key)}
                disabled={!has}
                className="h-[34px] min-w-[36px] rounded-lg px-2 text-[14px] font-bold transition-colors"
                style={has ? { background: C.card, border: `1px solid ${C.line}`, color: C.brand } : { background: "#F1F4F9", color: "#C2CBD8" }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: C.faint }}>
            <Loader2 className="h-5 w-5 animate-spin" /> 読み込み中…
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <SearchX className="mx-auto h-8 w-8" style={{ color: C.faint }} />
            <p className="mt-2 text-[15px] font-bold">該当する用語が見つかりません</p>
            <button onClick={resetFilters} className="mt-3 text-[13.5px] font-bold" style={{ color: C.brand }}>
              条件をリセットする
            </button>
          </div>
        ) : (
          rows.map((r) => {
            const list = sections.get(r.key);
            if (!list || list.length === 0) return null;
            return (
              <section key={r.key} id={`gy-${r.key}`} style={{ scrollMarginTop: 80 }}>
                <div className="mb-1 mt-6 flex items-center gap-3">
                  <span className="text-[21px] font-bold" style={{ color: C.brand }}>{r.label}</span>
                  <span className="h-px flex-1" style={{ background: C.line }} />
                </div>
                <div className="ml-8 divide-y md:ml-10" style={{ borderColor: "#EEF1F6" }}>
                  {list.map((t) => (
                    <div key={`${t.exam_id}-${t.term}`} className="py-4 md:grid md:grid-cols-[210px_1fr] md:gap-5" style={{ borderColor: "#EEF1F6" }}>
                      <div>
                        <div className="text-[16px] font-bold leading-snug">{t.term}</div>
                        {t.reading && <div className="mt-0.5 text-[12px]" style={{ color: C.faint }}>{t.reading}</div>}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: LEVEL_BADGE[t.exam_id]?.bg ?? "#EEF2F9", color: LEVEL_BADGE[t.exam_id]?.fg ?? "#33415A" }}>
                            {t.exam_id.toUpperCase()}
                          </span>
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "#EEF2F9", color: "#33415A" }}>
                            {t.category}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-[14px] leading-[1.75] md:mt-0" style={{ color: "#3A4658" }}>
                        {t.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}

        {!loading && (
          <p className="mt-8 text-center text-[12px]" style={{ color: C.faint }}>
            用語は順次追加していきます。レベル表記＝初出の試験（IP：ITパスポート／FE：基本情報／AP：応用情報）。
          </p>
        )}
      </main>
    </div>
  );
}

export default function GlossaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#F5F7FA" }} />}>
      <GlossaryContent />
    </Suspense>
  );
}
