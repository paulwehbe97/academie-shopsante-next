import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, revoke } = body;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId requis" }, { status: 400 });
    }

    // Soft revoke via champ Boolean
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { revoked: revoke ?? true }, // true si pas précisé
      select: { id: true, email: true, role: true, revoked: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error("/api/admin/users/revoke error", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
