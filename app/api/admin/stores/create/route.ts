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
    const { code, name } = await req.json();

    if (!code || !name) {
      return NextResponse.json({ ok: false, error: "Code et nom requis" }, { status: 400 });
    }

    const store = await prisma.store.create({
      data: { code, name },
    });

    return NextResponse.json({ ok: true, store });
  } catch (e: any) {
    console.error("Erreur création boutique:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
