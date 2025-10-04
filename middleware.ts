// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set<string>([
  "/invite",
  "/signup",
  "/revoked",   // <-- page publique pour les comptes désactivés
  "/api/auth",  // next-auth callbacks
  "/api/ping",
  "/_next",     // static
  "/favicon.ico",
]);

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  for (const p of PUBLIC_PATHS) if (pathname.startsWith(p)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Récupère le JWT NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role ?? "Employé";
  const revoked = (token as any)?.revoked ?? false;

  // Page par défaut selon rôle
  const home = role === "Admin" ? "/admin" : role === "Gérant" ? "/manager" : "/employee";

  // Page racine → redirige selon rôle
  if (pathname === "/") {
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Public paths → toujours laisser passer
  if (isPublicPath(pathname)) {
    // Sauf /invite & /signup si déjà connecté
    if ((pathname === "/invite" || pathname === "/signup") && token && searchParams.get("preview") !== "1") {
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  // Si pas connecté → redirige /invite
  if (!token) {
    return NextResponse.redirect(new URL("/invite", req.url));
  }

  // Si compte révoqué → redirige /revoked
  if (revoked) {
    return NextResponse.redirect(new URL("/revoked", req.url));
  }

  // Règles d’accès
  const isEmployee = role === "Employé" || role === "Gérant" || role === "Admin";
  const isManager  = role === "Gérant" || role === "Admin";
  const isAdmin    = role === "Admin";

  if (pathname.startsWith("/employee")) {
    return isEmployee ? NextResponse.next() : NextResponse.redirect(new URL(home, req.url));
  }

  if (pathname.startsWith("/manager")) {
    return isManager ? NextResponse.next() : NextResponse.redirect(new URL("/employee", req.url));
  }

  if (pathname.startsWith("/admin")) {
    return isAdmin ? NextResponse.next() : NextResponse.redirect(new URL("/employee", req.url));
  }

  // Sinon, laisse passer
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/", "/invite", "/signup", "/revoked",
    "/employee/:path*", "/manager/:path*", "/admin/:path*",
  ],
};
