import { updateSession } from "@/lib/supabase/middleware";
import { getUserRole, syncEmployeeRole } from "@/lib/auth/employee-sync";
import { isAdminRole, isEmployeePortalRole } from "@/lib/auth/roles";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseEnv() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function makeSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
}

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (!hasSupabaseEnv()) {
    return supabaseResponse;
  }

  try {
    const isAdminRoute = pathname.startsWith("/admin");
    const isAdminLogin = pathname === "/admin/login";
    const isEmployeeRoute = pathname.startsWith("/employee");
    const isEmployeePublic =
      pathname === "/employee/login" ||
      pathname === "/employee/register" ||
      pathname === "/employee";

    if (isAdminRoute && !isAdminLogin) {
      const supabase = makeSupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }

      const role = await getUserRole(user.id);
      if (!isAdminRole(role)) {
        const url = request.nextUrl.clone();
        if (isEmployeePortalRole(role)) {
          url.pathname = "/employee/dashboard";
        } else {
          url.pathname = "/admin/login";
          url.searchParams.set("error", "access_denied");
        }
        return NextResponse.redirect(url);
      }
    }

    if (isAdminLogin) {
      const supabase = makeSupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = await getUserRole(user.id);
        const url = request.nextUrl.clone();
        if (isAdminRole(role)) {
          url.pathname = "/admin/dashboard";
        } else if (isEmployeePortalRole(role)) {
          url.pathname = "/employee/dashboard";
        } else {
          url.pathname = "/admin/login";
          url.searchParams.set("error", "access_denied");
        }
        return NextResponse.redirect(url);
      }
    }

    if (isEmployeeRoute && !isEmployeePublic) {
      const supabase = makeSupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/employee/login";
        return NextResponse.redirect(url);
      }

      await syncEmployeeRole(user.id, user.email);
      const role = await getUserRole(user.id);

      const url = request.nextUrl.clone();
      if (isAdminRole(role)) {
        url.pathname = "/admin/dashboard";
        return NextResponse.redirect(url);
      }
      if (!isEmployeePortalRole(role)) {
        url.pathname = "/employee/login";
        url.searchParams.set("error", "not_employee");
        return NextResponse.redirect(url);
      }
    }

    if (pathname === "/employee/login" || pathname === "/employee/register" || pathname === "/employee") {
      const supabase = makeSupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await syncEmployeeRole(user.id, user.email);
        const role = await getUserRole(user.id);

        const url = request.nextUrl.clone();
        if (isEmployeePortalRole(role)) {
          url.pathname = "/employee/dashboard";
          return NextResponse.redirect(url);
        }
        if (isAdminRole(role)) {
          url.pathname = "/admin/dashboard";
          return NextResponse.redirect(url);
        }
      }
    }

    const isPublicMonitoring =
      pathname === "/" || pathname.startsWith("/employees/");

    if (isPublicMonitoring) {
      const supabase = makeSupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await syncEmployeeRole(user.id, user.email);
        const role = await getUserRole(user.id);
        if (isEmployeePortalRole(role)) {
          const url = request.nextUrl.clone();
          url.pathname = "/employee/dashboard";
          return NextResponse.redirect(url);
        }
      }
    }
  } catch {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
