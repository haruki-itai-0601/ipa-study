// サイト全体のパスワードゲート（オーナー専用公開）。
// 【2026-10-13】プロジェクト休止に伴い、一般公開を止めて本人だけが使える状態にするために追加。
//
// 仕様:
//   - 環境変数 SITE_PASSWORD が設定されているときだけゲートが有効になる（未設定なら従来どおり公開）。
//     → 解除したいときは Vercel の環境変数から SITE_PASSWORD を削除するだけでよい。
//   - Cookie にはパスワードそのものを入れず、HMAC-SHA256 の署名付きトークンを入れる。
//   - 署名鍵は SITE_GATE_SECRET（無ければ SITE_PASSWORD を流用）。
//     パスワードを変更すると既存トークンは自動的に無効になる。
//   - Edge ランタイム（proxy.ts）で動く必要があるため Buffer は使わず Web Crypto のみを使う。
const enc = new TextEncoder();

export const GATE_COOKIE = "site_gate";
/** 一度ログインしたら半年は保持（自分用なので毎回の入力を避ける） */
export const GATE_TTL_SEC = 60 * 60 * 24 * 180;

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
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

/** 定数時間比較（タイミング攻撃対策） */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** ゲートが有効か（SITE_PASSWORD が設定されているか） */
export function gateEnabled(): boolean {
  return !!process.env.SITE_PASSWORD;
}

function gateSecret(): string {
  return process.env.SITE_GATE_SECRET || process.env.SITE_PASSWORD || "";
}

/** 入力されたパスワードが正しいか（定数時間比較） */
export function verifyPassword(input: string): boolean {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** 署名付きトークンを発行。形式: `${exp}.${base64url(hmac)}` */
export async function createGateToken(ttlSec = GATE_TTL_SEC): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = await sign(gateSecret(), `gate:${exp}`);
  return `${exp}.${sig}`;
}

/** トークンを検証（期限内かつ署名一致） */
export async function verifyGateToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = gateSecret();
  if (!secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(secret, `gate:${exp}`);
  return safeEqual(sig, expected);
}

/** リダイレクト先として安全な内部パスだけを許可（オープンリダイレクト対策） */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  if (/[\\\t\r\n]/.test(next)) return "/";
  return next;
}
