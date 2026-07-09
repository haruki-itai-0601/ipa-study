import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

// 匿名でも叩けるエンドポイントのため、1回の取得行数・返却件数に上限を設けて
// 大量ダンプによる DB / 転送コストの暴発を防ぐ。
const POOL_CAP = 300; // ランダム出題のために取得する最大行数
const ALL_CAP = 2000; // all=true（ログイン限定）で取得する最大行数
const MAX_COUNT = 50; // 返却する最大問題数

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exam_id = searchParams.get("exam_id");
    const type = searchParams.get("type") ?? "ai";
    const countParam = searchParams.get("count");
    const count = countParam
      ? Math.min(MAX_COUNT, Math.max(1, parseInt(countParam, 10) || 5))
      : 5;

    if (!exam_id) {
      return NextResponse.json({ error: "exam_id is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const returnAll = searchParams.get("all") === "true";

    // 全件取得は匿名による大量ダンプ／コスト増幅を防ぐためログイン必須
    if (returnAll) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: "全件取得にはログインが必要です" },
          { status: 401 }
        );
      }
    }

    // 全件取得（ログイン限定）は従来どおり全カラムを返す。
    if (returnAll) {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", exam_id)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(ALL_CAP);
      if (error) {
        console.error("Supabase select error:", error);
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
      }
      return NextResponse.json({ questions: data ?? [] });
    }

    // ランダム出題（無認証）は、まず id だけのプール（数KB）を取得して抽選し、
    // 当選した count 件だけ全カラムを取得する。これで匿名の1リクエストあたり転送量を
    // 従来の約300行(≈285KB)から数KBへ削減しつつ、リクエストごとのランダム性は維持する。
    const { data: idRows, error: idErr } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_id", exam_id)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(POOL_CAP);

    if (idErr) {
      console.error("Supabase select error:", idErr);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    const ids = (idRows ?? []).map((r) => r.id as string);
    // Fisher–Yates で偏りなくシャッフルし、count 件を選ぶ
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const chosen = ids.slice(0, count);
    if (chosen.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    const { data: full, error: fullErr } = await supabase
      .from("questions")
      .select("*")
      .in("id", chosen);
    if (fullErr) {
      console.error("Supabase select error:", fullErr);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    // .in() の返却順は不定なので、抽選した順序に並べ直す
    const byId = new Map((full ?? []).map((q) => [q.id, q]));
    const questions = chosen.map((id) => byId.get(id)).filter(Boolean);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
