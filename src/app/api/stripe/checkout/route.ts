import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getStripe, PREMIUM_PRICE_JPY, PREMIUM_PRODUCT_NAME } from "@/lib/stripe";
import { PAYMENTS_ENABLED } from "@/lib/flags";

// プレミアム会員（月額サブスク）の Stripe Checkout セッションを作成する。
export async function POST(request: NextRequest) {
  try {
    // 決済の一時停止中はサーバー側でも受け付けない（UIを迂回した直接POST対策）。
    if (!PAYMENTS_ENABLED) {
      return NextResponse.json(
        { error: "プレミアム会員のお申し込みは現在準備中です" },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "決済は現在準備中です（Stripe未設定）" },
        { status: 503 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 匿名ユーザーは決済不可：メール/Googleで会員登録してから
    if (!user || user.is_anonymous || !user.email) {
      return NextResponse.json(
        { error: "プレミアム登録には会員登録（ログイン）が必要です", code: "auth_required" },
        { status: 401 }
      );
    }

    // 既存の購読状態を確認（RLS: 本人行のみ参照可）
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("status, stripe_customer_id, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const isActive =
      existing?.status === "active" &&
      (!existing.current_period_end || new Date(existing.current_period_end) > new Date());
    if (isActive) {
      return NextResponse.json(
        { error: "すでにプレミアム会員です", code: "already_member" },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;
    const priceId = process.env.STRIPE_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      // 既存の Stripe 顧客がいれば再利用、いなければメールから新規作成
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email }),
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              // STRIPE_PRICE_ID 未設定でも動くフォールバック（ダッシュボードでの商品作成不要）
              price_data: {
                currency: "jpy",
                unit_amount: PREMIUM_PRICE_JPY,
                recurring: { interval: "month" },
                product_data: { name: PREMIUM_PRODUCT_NAME },
              },
              quantity: 1,
            },
      ],
      metadata: { user_id: user.id },
      // 14日間無料トライアル。トライアル中は Stripe 上 trialing → Webアプリ側は webhook の
      // mapStatus で "active" に正規化されるため、既存のプレミアム判定がそのまま機能する。
      subscription_data: { metadata: { user_id: user.id }, trial_period_days: 14 },
      success_url: `${origin}/premium?checkout=success`,
      cancel_url: `${origin}/premium?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("stripe checkout error:", e);
    return NextResponse.json(
      { error: "決済ページの作成に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
