import { NextResponse } from "next/server";
import {
  GATE_COOKIE,
  GATE_TTL_SEC,
  createGateToken,
  gateEnabled,
  verifyPassword,
} from "@/lib/site-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** パスワードを検証し、合致したら署名付きCookieを発行する */
export async function POST(request: Request) {
  // ゲート無効（＝公開運用）のときは何もしない
  if (!gateEnabled()) {
    return NextResponse.json({ ok: true, gate: "disabled" });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    password = "";
  }

  if (!verifyPassword(password)) {
    // 総当たりを軽く抑制（レスポンスを一律に遅らせる）
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  const token = await createGateToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_TTL_SEC,
  });
  return res;
}

/** ログアウト（Cookie削除） */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
