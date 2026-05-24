import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getExam } from "@/lib/exams";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GeneratedQuestion {
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exam_id, count = 5 } = body as { exam_id: string; count: number };

    if (!exam_id) {
      return NextResponse.json({ error: "exam_id is required" }, { status: 400 });
    }

    const safeCount = Math.min(count, 20);
    const exam = getExam(exam_id);
    if (!exam) {
      return NextResponse.json({ error: "Invalid exam_id" }, { status: 400 });
    }

    const prompt = `あなたはIPA（情報処理推進機構）の「${exam.name}」試験の問題作成専門家です。
本試験と同等レベルの4択問題を${safeCount}問作成してください。

試験の出題カテゴリ：${exam.categories.join("、")}

以下の要件を厳守してください：
- 実際のIPA高度情報処理技術者試験のレベルと形式に準拠すること
- 各問題は4つの選択肢（a, b, c, d）を持つこと
- 正解は必ずa, b, c, dのいずれかであること
- 解説は正解の理由と不正解の理由を含む詳細なものにすること
- 難易度は easy / medium / hard のいずれかにすること

必ず以下のJSON形式のみで回答してください（マークダウンや余分なテキストは含めないこと）：
{
  "questions": [
    {
      "category": "カテゴリ名",
      "question": "問題文",
      "option_a": "選択肢Aの内容",
      "option_b": "選択肢Bの内容",
      "option_c": "選択肢Cの内容",
      "option_d": "選択肢Dの内容",
      "correct_answer": "a",
      "explanation": "解説文",
      "difficulty": "medium"
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    let parsed: { questions: GeneratedQuestion[] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response as JSON" },
        { status: 500 }
      );
    }

    const questions = parsed.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Invalid question format from Claude" },
        { status: 500 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const rows = questions.map((q) => ({
      exam_id,
      type: "ai",
      category: q.category,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    }));

    const { data: insertedRows, error: dbError } = await supabase
      .from("questions")
      .insert(rows)
      .select();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json({ error: "Failed to save questions" }, { status: 500 });
    }

    return NextResponse.json({ saved_count: insertedRows?.length ?? 0 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
