import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/accept-invite") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");

  // Let auth callbacks pass through without redirects
  if (isAuthCallback) {
    return supabaseResponse;
  }

  if (!user && !isAuthPage && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Only redirect away from auth pages if user has a portal_users record
  // (prevents stale auth sessions from blocking signup or invite acceptance)
  if (user && isAuthPage) {
    // Never redirect away from accept-invite — user needs to complete their profile
    if (request.nextUrl.pathname.startsWith("/accept-invite")) {
      return supabaseResponse;
    }

    const { data: portalUser } = await supabase
      .from("portal_users")
      .select("id")
      .eq("auth_id", user.id)
      .limit(1)
      .maybeSingle();

    if (portalUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
