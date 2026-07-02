import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

// ダッシュボード（/）以外の画面のヘッダー右端に常設する「ダッシュボードに戻る」ボタン。
// 親はヘッダーの flex 行を想定。右寄せしたい場合は className="ml-auto" を渡す
// （ヘッダー右側に既存要素がある場合は className="" でその後ろに並べる）。
export function BackToDashboard({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 ${className}`}
    >
      <LayoutDashboard className="h-4 w-4" />
      <span className="hidden sm:inline">ダッシュボードに戻る</span>
      <span className="sm:hidden">ダッシュボード</span>
    </Link>
  );
}
