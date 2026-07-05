"use client";

// モバイル専用の下部タブバー（md未満で表示）。
// タブ＝ホーム（今日の5問）／学習（ステップで学習）／復習（間違いの復習）／データ（統計）。
// クイズ・パス等の集中フローには置かない（設置は各ページ側で判断する）。

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Mountain, RotateCcw } from "lucide-react";
import { getActiveExam } from "@/lib/streak";

const C = { ink: "#15202E", faint: "#9AA6B6", brand: "#1D4ED8", line: "#E7EBF1" };

export function MobileTabBar() {
  const pathname = usePathname();
  const [exam, setExam] = useState("ip");
  useEffect(() => {
    setExam(getActiveExam());
  }, [pathname]);

  const tabs = [
    { key: "home", label: "ホーム", href: "/", icon: Home, active: pathname === "/" },
    { key: "learn", label: "学習", href: `/learn/${exam}`, icon: Mountain, active: pathname.startsWith("/learn") && !pathname.includes("/review") },
    { key: "review", label: "復習", href: `/learn/${exam}/review`, icon: RotateCcw, active: pathname.includes("/review") },
    { key: "stats", label: "データ", href: "/stats", icon: BarChart3, active: pathname === "/stats" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      style={{ background: "rgba(255,255,255,0.96)", borderColor: C.line, backdropFilter: "blur(10px)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className="flex flex-1 flex-col items-center gap-0.5 py-2">
            <t.icon className="h-[22px] w-[22px]" style={{ color: t.active ? C.brand : C.faint }} />
            <span className="text-[10.5px] font-bold" style={{ color: t.active ? C.brand : C.faint }}>
              {t.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
