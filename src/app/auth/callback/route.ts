import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";

// マジックリンク／メール確認のリンクを踏んだときの着地点。
// PKCEフロー(?code=...) と トークン確認(?token_hash=...&type=...) の両方に対応する。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/account?status=ok";

  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  const dest = ok ? next : "/account?status=error";
  return NextResponse.redirect(new URL(dest, origin));
}
