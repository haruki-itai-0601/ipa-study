import { Suspense } from "react";
import { GateClient } from "@/components/gate-client";

export const metadata = {
  title: "非公開サイト",
  // 非公開ページなので検索結果に出さない
  robots: { index: false, follow: false },
};

export default function GatePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5">
      <Suspense fallback={null}>
        <GateClient />
      </Suspense>
    </main>
  );
}
