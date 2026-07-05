"use client";

// 画面右上に共通で置くアカウント操作群（ログイン・新規登録／通知／アカウント）。
// ダッシュボード・学習ハブ・間違いの復習など、各ページのヘッダー右端で共有する。
// isGuest/name を渡さない場合はこのコンポーネント内で認証状態を取得する。

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const C = { brand: "#1D4ED8", brandSoft: "#EAF0FE", brandDeep: "#163FB0", line: "#E7EBF1", card: "#FFFFFF", muted: "#677488" };

export function TopBarAccount({
  isGuest: isGuestProp,
  name: nameProp,
  className = "",
}: {
  isGuest?: boolean;
  name?: string;
  className?: string;
}) {
  const [isGuest, setIsGuest] = useState<boolean>(isGuestProp ?? true);
  const [name, setName] = useState<string>(nameProp ?? "");

  // props未指定のページ（学習ハブ・復習など）では自前で認証状態を取得
  useEffect(() => {
    if (isGuestProp !== undefined) return;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); return; }
      const guest = !!user.is_anonymous;
      setIsGuest(guest);
      if (!guest) {
        const meta = user.user_metadata ?? {};
        setName((meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || "あなた");
      }
    })();
  }, [isGuestProp]);

  return (
    <div className={`flex flex-none items-center gap-2 ${className}`}>
      {isGuest && (
        <Link
          href="/account"
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-bold text-white"
          style={{ background: C.brand }}
        >
          <LogIn className="h-4 w-4" />
          ログイン・新規登録
        </Link>
      )}
      {/* 通知（機能は今後）。狭い画面では省略し、ログイン導線を優先 */}
      <button
        className="hidden h-[34px] w-[34px] items-center justify-center rounded-[10px] min-[430px]:flex"
        style={{ border: `1px solid ${C.line}`, background: C.card, color: C.muted }}
        aria-label="通知"
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>
      <Link href="/account" className="flex items-center gap-2 rounded-[10px] px-1 py-1 transition-colors hover:bg-gray-50" aria-label="アカウント">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-sm font-bold" style={{ background: C.brandSoft, color: C.brandDeep }}>
          {isGuest ? "ゲ" : (name || "あ").charAt(0)}
        </span>
        <span className="hidden text-[13px] font-medium sm:inline">{isGuest ? "ゲスト" : `${name}さん`}</span>
      </Link>
    </div>
  );
}
