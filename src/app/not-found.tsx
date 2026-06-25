import Link from "next/link";
import { Brain } from "lucide-react";

// ルートの 404。未一致URL全般もここで受ける（/q/[id] の不正IDなど）。
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto inline-flex items-center justify-center bg-indigo-600 rounded-2xl p-3 shadow-md shadow-indigo-500/30">
          <Brain className="w-7 h-7 text-white" />
        </div>
        <p className="text-5xl font-extrabold text-gray-900">404</p>
        <h1 className="text-lg font-bold text-gray-900">ページが見つかりません</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          お探しのページは削除されたか、URLが変更された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
