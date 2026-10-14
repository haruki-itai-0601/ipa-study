import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-token";
import { GATE_COOKIE, gateEnabled, verifyGateToken } from "@/lib/site-gate";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 【2026-10-13】サイト全体のパスワードゲート（オーナー専用公開）。
  // 環境変数 SITE_PASSWORD が設定されているときだけ有効。未設定なら従来どおり誰でも閲覧可。
  // 解除したいときは Vercel の環境変数から SITE_PASSWORD を削除する。
  if (gateEnabled() && pathname !== "/gate" && pathname !== "/api/gate") {
    const ok = await verifyGateToken(request.cookies.get(GATE_COOKIE)?.value);
    if (!ok) {
      const gateUrl = new URL("/gate", request.url);
      const back = pathname + request.nextUrl.search;
      if (back !== "/") gateUrl.searchParams.set("next", back);
      return NextResponse.redirect(gateUrl);
    }
  }

  // /admin/setup は TOTP_SECRET 未設定時のみ通過
  if (pathname.startsWith("/admin/setup")) {
    if (process.env.TOTP_SECRET) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    // TOTP未設定なら素通り（初期セットアップ画面）
    return NextResponse.next({ request });
  }

  // /admin ルートの保護（/admin/login は除外）
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("admin_token")?.value;
    const secret = process.env.ADMIN_SECRET;

    if (!secret || !(await verifyAdminToken(token, secret))) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Supabase セッションを更新（匿名ユーザー含む）
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
