import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

// Stripe カスタマーポータル（支払い方法の変更・解約）へのセッションを作成する。
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "決済は現在準備中です（Stripe未設定）" }, { status: 503 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) {
      return NextResponse.json({ error: "ログインが必要です", code: "auth_required" }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Stripeでのご契約が見つかりません", code: "no_customer" },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/premium`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("stripe portal error:", e);
    return NextResponse.json(
      { error: "お支払い管理ページを開けませんでした。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
