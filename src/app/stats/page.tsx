"use client";

// データタブ（モバイル）: 既存ダッシュボードをそのまま表示する。
// モバイルではサイドバーが消え、1カラムのレスポンシブ表示になる（下部タブバー付き）。
// デスクトップでは / と同内容（内部導線はモバイルのタブバーのみ）。

import { DashboardMain } from "@/components/dashboard-main";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export default function StatsPage() {
  return (
    <>
      <div className="pb-16 md:pb-0">
        <DashboardMain />
      </div>
      <MobileTabBar />
    </>
  );
}
