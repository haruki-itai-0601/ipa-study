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

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", exam_id)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(returnAll ? ALL_CAP : POOL_CAP);

    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    const all = data ?? [];

    if (returnAll) {
      return NextResponse.json({ questions: all });
    }

    // 取得した上限内プールから count 件をランダム抽出（Fisher–Yates で偏りなく）
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }

    return NextResponse.json({ questions: all.slice(0, count) });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
