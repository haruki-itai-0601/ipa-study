import { DashboardMain } from "@/components/dashboard-main";
import { OnboardingPopup } from "@/components/onboarding-popup";

// ホーム（/）＝新ダッシュボード本体。初回のみオンボーディング・ポップアップを重ねる。
// 旧ヒーローLP＋旧 home-dashboard は退役（LP訴求は OnboardingPopup へ集約）。
export default function Home() {
  return (
    <>
      <DashboardMain />
      <OnboardingPopup />
    </>
  );
}
