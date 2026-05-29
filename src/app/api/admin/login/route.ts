import { NextRequest, NextResponse } from "next/server";
import { verify } from "otplib";

export async function POST(request: NextRequest) {
  const { password, totp } = await request.json();
  const adminSecret = process.env.ADMIN_SECRET;
  const totpSecret = process.env.TOTP_SECRET;

  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET が設定されていません" }, { status: 500 });
  }

  // パスワード検証
  if (password !== adminSecret) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  // TOTP が設定されている場合は検証
  if (totpSecret) {
    if (!totp) {
      return NextResponse.json({ error: "認証コードを入力してください" }, { status: 401 });
    }
    const result = await verify({ token: totp, secret: totpSecret });
    if (!result.valid) {
      return NextResponse.json({ error: "認証コードが違います（時刻がずれている場合は再生成してください）" }, { status: 401 });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_token", adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7日間
    path: "/",
  });

  return response;
}
