import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exam_id = searchParams.get("exam_id");
    const type = searchParams.get("type") ?? "ai";
    const countParam = searchParams.get("count");
    const count = countParam ? Math.max(1, parseInt(countParam, 10)) : 5;

    if (!exam_id) {
      return NextResponse.json({ error: "exam_id is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", exam_id)
      .eq("type", type);

    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    const all = data ?? [];

    // ランダムにcount件を取得（足りない場合はある分だけ）
    const shuffled = all.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return NextResponse.json({ questions: selected });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
