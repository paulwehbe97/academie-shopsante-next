// app/api/invites/accept/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { inviteId } = await req.json(); // inviteId = jti
    if (!inviteId) {
      return NextResponse.json({ ok: false, error: "missing_inviteId" }, { status: 400 });
    }

    // 1) Cherche l'invitation par jti
    const inv = await prisma.inviteLog.findUnique({ where: { jti: inviteId } });
    if (!inv) {
      return NextResponse.json({ ok: false, error: "invite_not_found" }, { status: 404 });
    }
    if (inv.revokedAt) {
      return NextResponse.json({ ok: false, error: "invite_revoked" }, { status: 403 });
    }
    if (inv.acceptedAt) {
      return NextResponse.json({ ok: false, error: "already_accepted" }, { status: 409 });
    }

    // 2) Marque comme acceptée
    await prisma.inviteLog.update({
      where: { jti: inviteId },
      data: { acceptedAt: new Date() },
    });

    // 3) renvoie le rôle (pratique côté client)
    return NextResponse.json({
      ok: true,
      role: inv.role,        // "Employé" | "Gérant" | "Admin"
      storeCode: inv.storeCode,
      storeName: inv.storeName,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
