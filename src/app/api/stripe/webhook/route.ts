import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Stripe Webhook：決済完了・購読状態の変化を subscriptions テーブルへ反映する。
// 署名検証に生ボディが必要なため request.text() を使う。

// Stripe v22 では current_period_end はサブスクリプションアイテム側にある
function periodEndISO(sub: Stripe.Subscription): string | null {
  const ts = sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

// Stripe の購読ステータスをアプリ内ステータスへ変換（grade-pm は "active" のみ会員扱い）
function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  if (stripeStatus === "past_due") return "past_due";
  return "canceled";
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = createSupabaseAdminClient();
  if (!stripe || !webhookSecret || !admin) {
    console.error("stripe webhook: env not configured");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error("stripe webhook signature error:", e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!userId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const { error } = await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            status: mapStatus(sub.status),
            plan: "stripe",
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId,
            current_period_end: periodEndISO(sub),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (error) throw error;
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStatus(sub.status);
        const userId = sub.metadata?.user_id;

        const patch = {
          status,
          plan: "stripe",
          current_period_end: periodEndISO(sub),
          updated_at: new Date().toISOString(),
        };

        // metadata に user_id があれば upsert、なければ購読IDで既存行を更新
        if (userId) {
          const { error } = await admin.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
              stripe_subscription_id: sub.id,
              ...patch,
            },
            { onConflict: "user_id" }
          );
          if (error) throw error;
        } else {
          const { error } = await admin
            .from("subscriptions")
            .update(patch)
            .eq("stripe_subscription_id", sub.id);
          if (error) throw error;
        }
        break;
      }

      default:
        // 監視対象外のイベントは何もしない（200で受領）
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("stripe webhook handler error:", event.type, e);
    // 500 を返すと Stripe が自動リトライする
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
