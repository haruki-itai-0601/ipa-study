"use client";

// ルートのエラーバウンダリ（このNextフォークは reset ではなく unstable_retry を受け取る）
import { useEffect } from "react";
import Link from "next/link";
import { Brain, RotateCw } from "lucide-react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto inline-flex items-center justify-center bg-indigo-600 rounded-2xl p-3 shadow-md shadow-indigo-500/30">
          <Brain className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">問題が発生しました</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          一時的なエラーの可能性があります。少し時間をおいて、もう一度お試しください。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <RotateCw className="w-4 h-4" />
            再読み込み
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
