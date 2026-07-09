import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { basicExams, learnCategoryGroups } from "@/lib/exams";

// AI合格診断のシェア用OGP画像（1200x630）を動的生成する。
// - スコア入り: /api/og/shindan?e=fe&s=40&w=セキュリティ（白背景・ダッシュボード風）
// - ランディング用（s無し）: /api/og/shindan?e=fe（ブランドグラデ＋結果イメージのサンプルリング）
// フォントはカード内で使う文字＋かな全域のサブセット（assets/NotoSansJP-og.ttf・約95KB）。
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

const INK = "#15202E";
const MUTED = "#677488";
const BRAND = "#4F46E5";

function bandOf(score: number) {
  if (score >= 65) return { label: "合格圏", fg: "#0F8A5F", soft: "#E7F3EE" };
  if (score >= 40) return { label: "あと少し", fg: "#B45309", soft: "#FEF3C7" };
  return { label: "要対策", fg: "#BE123C", soft: "#FFE4E6" };
}

// 円形スコアゲージ（satoriはSVGのstrokeDasharrayを描画できる）
function Ring({
  score, size, stroke, track, color, textColor, subColor,
}: {
  score: number; size: number; stroke: number; track: string; color: string; textColor: string; subColor: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <div style={{ display: "flex", fontSize: size * 0.33, fontWeight: 700, lineHeight: 1, color: textColor }}>{score}</div>
        <div style={{ display: "flex", fontSize: size * 0.095, color: subColor, marginTop: 4 }}>/100</div>
      </div>
    </div>
  );
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
  const fonts = [
    { name: "NotoJP", data: font, weight: 400 as const, style: "normal" as const },
    { name: "NotoJP", data: font, weight: 700 as const, style: "normal" as const },
  ];

  if (generic) {
    // ===== ランディング用: ブランドグラデ＋結果イメージ（サンプルリング） =====
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            padding: "52px 72px",
            fontFamily: "NotoJP",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", maxWidth: 680 }}>
            <div style={{ display: "flex", fontSize: 28, opacity: 0.92 }}>過去問演習ラボ ／ AI合格診断</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 50, fontWeight: 700 }}>{examName}</div>
              <div style={{ display: "flex", fontSize: 38, fontWeight: 700, marginTop: 16, lineHeight: 1.4 }}>
                10問で、AIが合格可能性と
                <br />
                弱点を示します
              </div>
              <div style={{ display: "flex", fontSize: 24, opacity: 0.9, marginTop: 18 }}>
                対応：ITパスポート／基本情報／応用情報（午前）
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 25, opacity: 0.92, width: "100%" }}>
              <div style={{ display: "flex" }}>登録不要・約3分・本物の過去問</div>
              <div style={{ display: "flex" }}>kakomon-labo.com</div>
            </div>
          </div>

          {/* 結果イメージ（白カード＋サンプルスコア） */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "#FFFFFF",
              borderRadius: 28,
              padding: "30px 38px",
              boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                background: "#111827",
                color: "#fff",
                borderRadius: 999,
                padding: "6px 18px",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              結果イメージ
            </div>
            <div style={{ display: "flex", marginTop: 18 }}>
              <Ring score={65} size={210} stroke={18} track="#E7EBF1" color="#0F8A5F" textColor={INK} subColor={MUTED} />
            </div>
            <div
              style={{
                display: "flex",
                background: "#E7F3EE",
                color: "#0F8A5F",
                borderRadius: 999,
                padding: "8px 24px",
                fontSize: 26,
                fontWeight: 700,
                marginTop: 16,
              }}
            >
              合格圏
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts,
        // 出力は許可済みクエリパラメータの純粋関数。CDNでキャッシュして
        // 無認証エンドポイントの再ラスタライズによるCPU/コスト増幅を封じる（Xクローラも高速化）。
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
      }
    );
  }

  // ===== スコア入り: 白背景（ダッシュボード風） =====
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFFFFF",
          padding: "44px 72px",
          fontFamily: "NotoJP",
          color: INK,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: BRAND }}>過去問演習ラボ ／ AI合格診断</div>
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700, marginTop: 8 }}>{examName}</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#9AA6B6", marginTop: 8 }}>kakomon-labo.com</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <Ring score={score} size={250} stroke={20} track="#E7EBF1" color={band.fg} textColor={INK} subColor={MUTED} />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 32, color: MUTED }}>合格可能性スコア</div>
            <div
              style={{
                display: "flex",
                background: band.soft,
                color: band.fg,
                borderRadius: 18,
                padding: "12px 30px",
                fontSize: 42,
                fontWeight: 700,
                alignSelf: "flex-start",
              }}
            >
              {band.label}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {weak ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#F1F4F9",
                borderRadius: 16,
                padding: "16px 26px",
                fontSize: 36,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              AIの診断：最大の弱点は
              <span style={{ color: "#BE123C", marginLeft: 8 }}>「{weak}」</span>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: MUTED }}>
            <div style={{ display: "flex" }}>10問・3分・登録不要で診断できます</div>
            <div style={{ display: "flex" }}>対応：ITパスポート／基本情報／応用情報（午前）</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
