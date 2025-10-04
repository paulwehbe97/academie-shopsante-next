// Désactive le rendu statique pour cette route API
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// app/api/certificates/by-user/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/db";



/**
 * GET /api/certificates/by-user?email=... | userId=...
 * Rôles autorisés: Admin, Gérant
 * - Gérant: ne peut consulter que les employés de SA boutique (storeCode)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    const userId = (url.searchParams.get("userId") || "").trim();

    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const role = (token as any).role as "Employé" | "Gérant" | "Admin" | undefined;
    const viewerStoreCode = (token as any).storeCode as string | null;

    if (role !== "Admin" && role !== "Gérant") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Trouve la cible (employé)
    const target = await prisma.user.findFirst({
      where: email ? { email } : { id: userId || undefined },
      select: { id: true, email: true, storeCode: true, name: true },
    });

    if (!target) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Règle gérant: même boutique uniquement
    if (role === "Gérant") {
      if (!viewerStoreCode || !target.storeCode || viewerStoreCode !== target.storeCode) {
        return NextResponse.json({ ok: false, error: "forbidden_store" }, { status: 403 });
      }
    }

    const items = await prisma.certificate.findMany({
      where: { userId: target.id },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        levelKey: true,
        chapterId: true,
        chapterTitle: true,
        filePath: true,
        issuedAt: true,
        sentAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      target: { id: target.id, email: target.email, name: target.name, storeCode: target.storeCode },
      items,
    });
  } catch (e) {
    console.error("[certificates/by-user] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
