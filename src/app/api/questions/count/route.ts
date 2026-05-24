import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const exam_id = searchParams.get("exam_id");
  const type = searchParams.get("type") ?? "ai";

  if (!exam_id) {
    return NextResponse.json({ error: "exam_id is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", exam_id)
    .eq("type", type);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
