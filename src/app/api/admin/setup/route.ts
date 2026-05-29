import { NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

export async function GET() {
  // TOTP_SECRET がすでに設定済みなら setup 不可
  if (process.env.TOTP_SECRET) {
    return NextResponse.json({ error: "すでに設定済みです" }, { status: 403 });
  }

  const secret = generateSecret();
  const otpauth = generateURI({ secret, label: "admin", issuer: "IPA問題道場" });
  const qrCode = await QRCode.toDataURL(otpauth);

  return NextResponse.json({ secret, qrCode });
}
