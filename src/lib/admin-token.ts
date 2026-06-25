// 管理者用の署名付きセッショントークン（Web Crypto・edge/node 両対応）。
// 生の ADMIN_SECRET を Cookie に保存せず、HMAC-SHA256 署名＋有効期限で検証する。
// これにより Cookie が漏れてもマスター秘密そのものは露出せず、期限切れで自然失効する。
const enc = new TextEncoder();

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // btoa は edge / Node 双方で利用可能（Buffer は edge 非対応のため使わない）
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return toB64Url(new Uint8Array(sig));
}

/** 定数時間の文字列比較（タイミング攻撃対策）。長さ不一致は即 false。 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 署名付きトークンを発行（既定 7 日有効）。形式: `${exp}.${base64url(hmac)}` */
export async function createAdminToken(secret: string, ttlSec = 60 * 60 * 24 * 7): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = await sign(secret, `admin:${exp}`);
  return `${exp}.${sig}`;
}

/** 署名付きトークンを検証（有効期限内かつ HMAC が一致するか）。 */
export async function verifyAdminToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(secret, `admin:${exp}`);
  return safeEqual(sig, expected);
}
