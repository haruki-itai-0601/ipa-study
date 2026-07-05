import { DashboardMain } from "@/components/dashboard-main";
import { MobileHome } from "@/components/mobile-home";
import { OnboardingPopup } from "@/components/onboarding-popup";

// ホーム（/）。
// - デスクトップ = 新ダッシュボード本体（従来どおり）
// - モバイル = アクション型ホーム「今日の5問」（市場調査: スキマ時間×テンポ最優先のため、統計より行動を先に）
// 初回のみオンボーディング・ポップアップを重ねる。
export default function Home() {
  return (
    <>
      <div className="md:hidden">
        <MobileHome />
      </div>
      <div className="hidden md:block">
        <DashboardMain />
      </div>
      <OnboardingPopup />
    </>
  );
}
