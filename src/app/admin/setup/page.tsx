"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Copy, Check, Lock } from "lucide-react";

export default function AdminSetupPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 管理パスワードを送ってTOTPシードを取得（未認証発行を防止）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "エラーが発生しました");
      } else {
        setSecret(data.secret);
        // 外部 QR コード API で画像 URL を生成（npm パッケージ不要）
        setQrCode(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.uri)}&size=200x200`);
      }
    } catch {
      setError("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // シード取得前：管理パスワードの入力フォーム
  if (!qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm p-8 space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mx-auto mb-3">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">TOTP 初期設定</h1>
            <p className="mt-1 text-sm text-gray-500">管理パスワードを入力してください</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理パスワード"
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            シードを生成
          </button>
          <a href="/admin/login" className="block text-center text-sm text-indigo-600 hover:underline">ログインページへ</a>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">TOTP 初期設定</h1>
          <p className="text-sm text-gray-500">Google Authenticator でQRコードをスキャンしてください</p>
        </div>

        {/* QRコード */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
        </div>

        {/* シークレット表示 */}
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">TOTP_SECRET（環境変数に設定してください）</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <code className="text-sm font-mono text-gray-800 flex-1 break-all">{secret}</code>
            <button onClick={handleCopy} className="flex-shrink-0 text-gray-400 hover:text-gray-700">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 手順 */}
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Google Authenticator（またはAUthy）でQRコードをスキャン</li>
          <li>上記の <code className="bg-gray-100 px-1 rounded text-xs">TOTP_SECRET</code> を <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code> と Vercel の環境変数に追加</li>
          <li>dev server を再起動（または Vercel を再デプロイ）</li>
          <li>ログインページでパスワード＋6桁コードでサインイン</li>
        </ol>

        <p className="text-xs text-red-500 text-center">
          ⚠ このシークレットは再表示できません。必ずコピーしてください。
        </p>
      </div>
    </div>
  );
}
