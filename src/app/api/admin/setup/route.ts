import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { safeEqual } from "@/lib/admin-token";

/** crypto のみで Base32 シークレットを生成（otplib 不要） */
function generateBase32Secret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = randomBytes(20);
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      result += alphabet[(buffer >>> (bitsLeft - 5)) & 0x1f];
      bitsLeft -= 5;
    }
  }
  if (bitsLeft > 0) {
    result += alphabet[(buffer << (5 - bitsLeft)) & 0x1f];
  }
  return result;
}

// TOTP シードの発行は「管理パスワードを知っている人」に限定する（POST + ADMIN_SECRET 照合）。
// 以前は未認証GETで誰でもシードを取得でき、2FAが実質パスワード1要素に劣化していた。
export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET が設定されていません" }, { status: 500 });
  }
  // すでに TOTP_SECRET 設定済みなら setup 不可
  if (process.env.TOTP_SECRET) {
    return NextResponse.json({ error: "すでに設定済みです" }, { status: 403 });
  }
  // 管理パスワード必須（定数時間比較）
  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    password = undefined;
  }
  if (typeof password !== "string" || !safeEqual(password, adminSecret)) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  const secret = generateBase32Secret();
  const uri = `otpauth://totp/IPA%E5%95%8F%E9%A1%8C%E9%81%93%E5%A0%B4:admin?secret=${secret}&issuer=IPA%E5%95%8F%E9%A1%8C%E9%81%93%E5%A0%B4`;

  return NextResponse.json({ secret, uri });
}
