import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

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

export async function GET() {
  // TOTP_SECRET がすでに設定済みなら setup 不可
  if (process.env.TOTP_SECRET) {
    return NextResponse.json({ error: "すでに設定済みです" }, { status: 403 });
  }

  const secret = generateBase32Secret();
  const uri = `otpauth://totp/IPA%E5%95%8F%E9%A1%8C%E9%81%93%E5%A0%B4:admin?secret=${secret}&issuer=IPA%E5%95%8F%E9%A1%8C%E9%81%93%E5%A0%B4`;

  return NextResponse.json({ secret, uri });
}
