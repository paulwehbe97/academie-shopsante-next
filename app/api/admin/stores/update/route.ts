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
    const { id, code, name } = await req.json();

    if (!id || !code || !name) {
      return NextResponse.json({ ok: false, error: "Champs requis manquants" }, { status: 400 });
    }

    const store = await prisma.store.update({
      where: { id },
      data: { code, name },
    });

    return NextResponse.json({ ok: true, store });
  } catch (e: any) {
    console.error("Erreur update boutique:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
