import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

// 午後問題の「記述式」設問を Claude（Haiku）で採点する。
// 正解（模範解答）は subId からサーバー側で取得するため、クライアントには渡さない＝カンニング防止。
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subId: unknown = body?.subId;
    const userAnswer: unknown = body?.userAnswer;

    if (typeof subId !== "string" || typeof userAnswer !== "string") {
      return NextResponse.json({ error: "subId と userAnswer は必須です" }, { status: 400 });
    }
    if (!userAnswer.trim()) {
      return NextResponse.json({ error: "解答が空です" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 会員チェック：AI採点は有料会員限定。非会員にはAIを呼ばない＝課金が発生しない。
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
    const isActiveMember =
      subscription?.status === "active" &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());
    if (!isActiveMember) {
      return NextResponse.json(
        { error: "AI採点は有料会員限定です", code: "not_member" },
        { status: 403 }
      );
    }

    // 設問の模範解答をサーバー側で取得（pm_sub_answers は select 全員可）
    const { data: sub, error } = await supabase
      .from("pm_sub_answers")
      .select("label, answer_type, correct")
      .eq("id", subId)
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json({ error: "設問が見つかりません" }, { status: 404 });
    }
    if (sub.answer_type !== "text") {
      return NextResponse.json({ error: "AI採点は記述式設問のみ対象です" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI採点は現在利用できません（APIキー未設定）" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });

    const system =
      "あなたはIPA応用情報技術者試験（午後）の採点者です。受験者の記述解答を、公式の模範解答と意味的に照らし合わせて採点してください。" +
      "表現や言い回しが違っても要点が合っていれば correct（正解）、要点の一部のみ合致していれば partial（部分点）、要点を外していれば wrong（不正解）とします。" +
      "講評は日本語で簡潔に（80字以内目安）、何が良かったか・何が足りないかを具体的に示してください。";

    const userPrompt =
      `【設問】${sub.label}\n` +
      `【模範解答】${sub.correct}\n` +
      `【受験者の解答】${userAnswer}\n\n` +
      `上記を採点してください。`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              result: { type: "string", enum: ["correct", "partial", "wrong"] },
              comment: { type: "string" },
            },
            required: ["result", "comment"],
            additionalProperties: false,
          },
        },
      },
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    let parsed: { result?: string; comment?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "採点結果の解析に失敗しました" }, { status: 502 });
    }

    const result = parsed.result === "correct" || parsed.result === "partial" || parsed.result === "wrong"
      ? parsed.result
      : "partial";

    return NextResponse.json({
      result, // "correct" | "partial" | "wrong"
      comment: typeof parsed.comment === "string" ? parsed.comment : "",
      correct: sub.correct, // 採点後に模範解答も返す（UI表示用）
    });
  } catch (e) {
    console.error("grade-pm error:", e);
    return NextResponse.json({ error: "採点に失敗しました。時間をおいて再度お試しください。" }, { status: 500 });
  }
}
