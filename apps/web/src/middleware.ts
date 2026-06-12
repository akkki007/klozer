import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const mustChange = req.auth?.user?.mustChangePassword === true;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Mandatory password change: until cleared, the user can only reach
  // /change-password (and sign-out). Everything else redirects there.
  if (isLoggedIn && mustChange && !pathname.startsWith("/change-password")) {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }
  // Once cleared, don't let them sit on the change-password page.
  if (isLoggedIn && !mustChange && pathname.startsWith("/change-password")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
