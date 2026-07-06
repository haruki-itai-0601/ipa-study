import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve } from "path";

// Claude Code のローカル環境ではシェルに空の ANTHROPIC_API_KEY 等が存在し、
// Next の .env.local 自動読み込みより優先されてしまう。開発時のみ、空になっている
// キーを .env.local の値で補完する（process.env への副作用として設定）。
// ★重要: 以前は next.config の `env:{}` で渡していたが、それは値をJSバンドルに
// リテラル埋め込みするため秘密鍵漏洩の温床だった。runtime の process.env 補完に変更し、
// 本番(Vercel)では下の分岐を通さず、Vercel が注入する環境変数をそのまま使う。
function hydrateEnvLocalForDev(): void {
  if (process.env.NODE_ENV === "production") return; // 本番では一切ロードしない
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      if (!line.includes("=") || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim();
      // 未設定 or 空文字のときだけ補完（本物の値が入っていれば尊重）
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local が無い環境（本番など）は無視
  }
}

hydrateEnvLocalForDev();

// 全ページに付与するセキュリティヘッダ。CSP はインライン(GA4/JSON-LD)や Stripe/Supabase の
// 許可設計が必要なため別途対応（本セットは機能を壊さない安全なものに限定）。
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // クリックジャッキング防止。同一オリジンの iframe（ローカル検証ツール等）は許可。
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  // Node.js ネイティブ API を使うパッケージは webpack バンドル対象から除外
  serverExternalPackages: ["otplib", "qrcode"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
