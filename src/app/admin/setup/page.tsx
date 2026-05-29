"use client";

import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, Copy, Check } from "lucide-react";

export default function AdminSetupPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((res) => res.json())
      .then(async (data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSecret(data.secret);
          // QR コードはブラウザ側で生成（Turbopack サーバーバンドル対象外）
          const QRCode = (await import("qrcode")).default;
          const dataURL = await QRCode.toDataURL(data.uri, { width: 200 });
          setQrCode(dataURL);
        }
      })
      .catch(() => setError("エラーが発生しました"));
  }, []);

  const handleCopy = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
          <p className="text-gray-700 font-semibold mb-2">設定済みです</p>
          <p className="text-sm text-gray-500">{error}</p>
          <a href="/admin/login" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  if (!qrCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
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
