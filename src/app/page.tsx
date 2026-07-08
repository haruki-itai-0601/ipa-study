import { OnboardingPopup } from "@/components/onboarding-popup";
import { ResponsiveHome } from "@/components/responsive-home";

// ホーム（/）。
// - デスクトップ = 新ダッシュボード本体（従来どおり）
// - モバイル = アクション型ホーム「今日の5問」（市場調査: スキマ時間×テンポ最優先のため、統計より行動を先に）
// 出し分けは ResponsiveHome（matchMediaで片方だけマウント＝非表示側の二重フェッチ防止）。
// 初回のみオンボーディング・ポップアップを重ねる。
export default function Home() {
  return (
    <>
      <ResponsiveHome />
      <OnboardingPopup />
    </>
  );
}
