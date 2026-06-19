import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getExam } from "@/lib/exams";
import Anthropic from "@anthropic-ai/sdk";

// AIレコメンド（プレミアム会員限定）。
// 受験者の分野別正答率（get_weakness_stats）をもとに、AIが「次にやるべき演習＋学習アドバイス」を提案する。
const MIN_FOR_WEAK = 3;

type Row = { exam_id: string; category: string; answered: number; correct: number };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const examId: unknown = body?.examId;
    if (typeof examId !== "string" || !getExam(examId)) {
      return NextResponse.json({ error: "examId が不正です" }, { status: 400 });
    }
    const exam = getExam(examId)!;

    const supabase = await createSupabaseServerClient();

    // ログイン＋プレミアム判定（trialing は webhook で "active" に正規化済み＝初月無料も会員扱い）
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です", code: "auth_required" }, { status: 401 });
    }
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    const isMember =
      subscription?.status === "active" &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());
    if (!isMember) {
      return NextResponse.json(
        { error: "AIレコメンドはプレミアム会員限定です", code: "not_member" },
        { status: 403 }
      );
    }

    // 弱点統計（本人のRLSで集計）
    const { data: statData } = await supabase.rpc("get_weakness_stats");
    const rows: Row[] = ((statData as Row[] | null) ?? [])
      .filter((x) => x.exam_id === examId)
      .map((x) => ({ ...x, answered: Number(x.answered), correct: Number(x.correct) }));

    const totalAnswered = rows.reduce((s, x) => s + x.answered, 0);
    const totalCorrect = rows.reduce((s, x) => s + x.correct, 0);

    // データが少なすぎる場合は LLM を呼ばず案内（コスト節約＋精度確保）
    if (totalAnswered < 5) {
      return NextResponse.json({
        advice: `まだ${exam.name}の解答数が少なく、精度の高い分析ができません。まずは過去問を10〜20問ほど解いてみてください。解くほど、AIがあなた専用の弱点と最短の学習プランを提案できます。`,
        steps: ["まず過去問を10問解いてみる", "間違えた問題は解説をしっかり読む", "もう一度ここでAIに相談する"],
        focusCategory: null,
        examId,
      });
    }

    const cats = rows
      .filter((x) => x.answered > 0)
      .map((x) => ({
        category: x.category,
        answered: x.answered,
        correct: x.correct,
        acc: Math.round((x.correct / x.answered) * 100),
      }))
      .sort((a, b) => a.acc - b.acc);
    const overallAcc = Math.round((totalCorrect / totalAnswered) * 100);
    const weak = cats.filter((c) => c.answered >= MIN_FOR_WEAK);
    const focusCategory = (weak[0] ?? cats[0]).category;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AIレコメンドは現在利用できません（APIキー未設定）" }, { status: 503 });
    }
    const client = new Anthropic({ apiKey });

    const statLines = cats.map((c) => `・${c.category}：${c.acc}%（${c.correct}/${c.answered}問）`).join("\n");
    const system =
      "あなたはIPA情報処理技術者試験の学習を伴走するAIコーチです。受験者の分野別正答率データをもとに、" +
      "合格に向けて『今やるべきこと』を、励ましつつ具体的に助言します。専門用語は噛み砕き、すべて日本語で。" +
      "advice は200字以内で、強み・弱み・なぜその分野を優先すべきかを簡潔に述べる。" +
      "steps は2〜3個の短い実行手順（各30字以内）。";
    const userPrompt =
      `【試験】${exam.name}\n` +
      `【総合正答率】${overallAcc}%（${totalCorrect}/${totalAnswered}問）\n` +
      `【分野別正答率（低い順）】\n${statLines}\n\n` +
      `最優先で対策すべき分野は「${focusCategory}」です。この分野を中心に、合格への最短アドバイスと実行ステップを作成してください。`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              advice: { type: "string" },
              steps: { type: "array", items: { type: "string" } },
            },
            required: ["advice", "steps"],
            additionalProperties: false,
          },
        },
      },
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    let parsed: { advice?: string; steps?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AIレコメンドの生成に失敗しました" }, { status: 502 });
    }

    return NextResponse.json({
      advice: typeof parsed.advice === "string" ? parsed.advice : "",
      steps: Array.isArray(parsed.steps) ? parsed.steps.filter((s) => typeof s === "string").slice(0, 4) : [],
      focusCategory,
      examId,
    });
  } catch (e) {
    console.error("recommend error:", e);
    return NextResponse.json(
      { error: "AIレコメンドの生成に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
