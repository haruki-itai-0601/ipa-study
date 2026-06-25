import { Loader2 } from "lucide-react";

// 画面遷移・データ取得中の即時フォールバック（白画面防止）
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-600" aria-label="読み込み中" />
    </div>
  );
}
