import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve } from "path";

// Claude Code 環境ではシステム環境変数に空の ANTHROPIC_API_KEY が存在するため
// .env.local から直接読み込んで上書きする（Vercel では .env.local が存在しないため無視される）
function readEnvLocal(): Record<string, string> {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    return Object.fromEntries(
      content
        .split("\n")
        .filter((line) => line.includes("=") && !line.startsWith("#"))
        .map((line) => {
          const eqIdx = line.indexOf("=");
          return [line.slice(0, eqIdx).trim(), line.slice(eqIdx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const envLocal = readEnvLocal();

const nextConfig: NextConfig = {
  env: {
    // .env.local の値を優先し、なければ process.env（Vercel の設定値）にフォールバック
    ANTHROPIC_API_KEY: envLocal.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "",
    ADMIN_SECRET: envLocal.ADMIN_SECRET ?? process.env.ADMIN_SECRET ?? "",
    TOTP_SECRET: envLocal.TOTP_SECRET ?? process.env.TOTP_SECRET ?? "",
  },
};

export default nextConfig;
