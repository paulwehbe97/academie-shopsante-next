import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID requis" }, { status: 400 });
    }

    // Vérifier la boutique
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return NextResponse.json({ ok: false, error: "Boutique introuvable" }, { status: 404 });
    }

    // Vérifier si des utilisateurs y sont rattachés
    const usersCount = await prisma.user.count({
      where: { storeCode: store.code },
    });

    if (usersCount > 0) {
      return NextResponse.json(
        { ok: false, error: `Impossible de supprimer : ${usersCount} utilisateur(s) assigné(s)` },
        { status: 400 }
      );
    }

    // Suppression
    await prisma.store.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Erreur suppression boutique:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
