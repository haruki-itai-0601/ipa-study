"use client";

// ホームのモバイル／デスクトップ出し分け。
// CSS(md:hidden)で両方マウントすると非表示側のDashboardMain/MobileHomeまで
// データ取得が走って二重フェッチになるため、matchMediaで片方だけマウントする。
import { useEffect, useState } from "react";
import { DashboardMain } from "@/components/dashboard-main";
import { MobileHome } from "@/components/mobile-home";

export function ResponsiveHome() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  if (desktop === null) return null; // 判定まで何も出さない（両コンポーネントとも直後に自前のスケルトンを出す）
  return desktop ? <DashboardMain /> : <MobileHome />;
}
