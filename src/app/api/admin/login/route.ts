import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminToken, safeEqual } from "@/lib/admin-token";

/** Base32 → Buffer（crypto のみ、otplib 不要） */
function base32Decode(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let buffer = 0;
  let bitsLeft = 0;
  const result: number[] = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    buffer = (buffer << 5) | idx;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      result.push((buffer >>> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return Buffer.from(result);
}

/** 指定タイムステップの TOTP コードを計算 */
function getTOTPCode(secret: string, timeStep: number): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(timeStep));
  const hmac = createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

/** ±1 タイムステップ許容で検証 */
function verifyTOTP(token: string, secret: string): boolean {
  const step = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (getTOTPCode(secret, step + delta) === token) return true;
  }
  return false;
}

// 簡易レート制限（管理パスワードの総当たり対策）。サーバーレスのためインスタンス単位の
// ベストエフォートだが、無いよりは総当たりを大幅に鈍化させる。恒久対策はパスワードの
// 長ランダム化（ADMIN_SECRET）とTOTP有効化。
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (attempts.size > 5000) attempts.clear(); // メモリ暴走の簡易ガード
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count++;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。しばらく待って再度お試しください。" },
      { status: 429 }
    );
  }

  const { password, totp } = await request.json();
  const adminSecret = process.env.ADMIN_SECRET;
  const totpSecret = process.env.TOTP_SECRET;

  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET が設定されていません" }, { status: 500 });
  }

  // パスワード検証（定数時間比較でタイミング攻撃を回避）
  if (typeof password !== "string" || !safeEqual(password, adminSecret)) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  // TOTP が設定されている場合は検証
  if (totpSecret) {
    if (!totp) {
      return NextResponse.json({ error: "認証コードを入力してください" }, { status: 401 });
    }
    if (!verifyTOTP(totp, totpSecret)) {
      return NextResponse.json(
        { error: "認証コードが違います（時刻がずれている場合は再生成してください）" },
        { status: 401 }
      );
    }
  }

  const response = NextResponse.json({ ok: true });
  // 生の ADMIN_SECRET ではなく HMAC 署名付きトークンを保存（Cookie 漏洩時もマスター秘密は露出せず、期限で自然失効）
  const token = await createAdminToken(adminSecret, 60 * 60 * 24 * 7);
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7日間
    path: "/",
  });

  return response;
}
