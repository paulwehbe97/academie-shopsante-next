import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const me = session?.user as any;

  if (!me?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { jti } = body;

  if (!jti) {
    return NextResponse.json({ ok: false, error: "jti requis" }, { status: 400 });
  }

  try {
    // ✅ 1. Vérifie si l’invitation existe avant de l’update
    const existing = await prisma.inviteLog.findUnique({ where: { jti } });

    if (!existing) {
      console.warn("Invitation introuvable dans inviteLog pour jti:", jti);
    } else {
      await prisma.inviteLog.update({
        where: { jti },
        data: { revokedAt: new Date() },
      });
    }

    // ✅ 2. Ajoute le JTI dans la table RevokedInvite (blacklist)
    await prisma.revokedInvite.create({
      data: { id: jti, added: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("/api/invites/revoke error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
