import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { basicExams, learnCategoryGroups } from "@/lib/exams";

// AI合格診断のシェア用OGP画像（1200x630）を動的生成する。
// /api/og/shindan?e=fe&s=40&w=セキュリティ
// フォントはカード内で使う文字だけに絞ったサブセット（assets/NotoSansJP-og.ttf・約360KB）。
export const runtime = "nodejs";

let fontCache: Buffer | null = null;
async function loadFont() {
  if (!fontCache) {
    fontCache = await readFile(join(process.cwd(), "assets", "NotoSansJP-og.ttf"));
  }
  return fontCache;
}

// 弱点名は実在の分野名のみ許可（任意文字列の描画を防ぐ＝サブセットフォント外の文字対策も兼ねる）
const CATEGORY_WHITELIST = new Set<string>([
  ...basicExams.flatMap((e) => e.categories),
  ...Object.values(learnCategoryGroups).flatMap((groups) => groups.flatMap((g) => g.categories)),
]);

function bandOf(score: number) {
  if (score >= 65) return { label: "合格圏", bg: "#0F8A5F" };
  if (score >= 40) return { label: "あと少し", bg: "#B45309" };
  return { label: "要対策", bg: "#BE123C" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exam = basicExams.find((x) => x.id === (searchParams.get("e") ?? "fe"));
  const examName = exam ? exam.name : "情報処理技術者試験";
  const sRaw = searchParams.get("s");
  const generic = sRaw === null; // ランディング用（スコアなしの汎用カード）
  const score = Math.max(0, Math.min(100, parseInt(sRaw ?? "0", 10) || 0));
  const wRaw = searchParams.get("w") ?? "";
  const weak = CATEGORY_WHITELIST.has(wRaw) ? wRaw : "";
  const band = bandOf(score);
  const font = await loadFont();

  if (generic) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            padding: "64px 72px",
            fontFamily: "NotoJP",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", fontSize: 32, opacity: 0.92 }}>過去問演習ラボ ／ AI合格診断</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700 }}>{examName}</div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, marginTop: 20, lineHeight: 1.4 }}>
              10問で、AIが合格可能性と弱点を名指しします
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, opacity: 0.92 }}>
            <div style={{ display: "flex" }}>登録不要・約3分・本物の過去問</div>
            <div style={{ display: "flex" }}>kakomon-labo.com</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "NotoJP", data: font, weight: 400, style: "normal" },
          { name: "NotoJP", data: font, weight: 700, style: "normal" },
        ],
      }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          padding: "56px 72px",
          fontFamily: "NotoJP",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.92 }}>過去問演習ラボ ／ AI合格診断</div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, marginTop: 10 }}>{examName}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.9 }}>合格可能性スコア</div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 150, fontWeight: 700, lineHeight: 1.05 }}>{score}</div>
              <div style={{ display: "flex", fontSize: 46, opacity: 0.85, marginBottom: 18 }}>/100</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              background: band.bg,
              borderRadius: 18,
              padding: "14px 30px",
              fontSize: 42,
              fontWeight: 700,
              marginTop: 44,
            }}
          >
            {band.label}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {weak ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.16)",
                borderRadius: 16,
                padding: "16px 26px",
                fontSize: 38,
                fontWeight: 700,
                marginBottom: 22,
              }}
            >
              AIの名指し：最大の弱点は「{weak}」
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 27, opacity: 0.92 }}>
            <div style={{ display: "flex" }}>10問・3分・登録不要で診断できます</div>
            <div style={{ display: "flex" }}>kakomon-labo.com</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "NotoJP", data: font, weight: 400, style: "normal" },
        { name: "NotoJP", data: font, weight: 700, style: "normal" },
      ],
    }
  );
}
