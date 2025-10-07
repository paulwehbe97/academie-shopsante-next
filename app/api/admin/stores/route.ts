import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: toutes les boutiques
export async function GET() {
  const stores = await prisma.store.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ ok: true, stores });
}

// POST: créer une nouvelle boutique
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { code, name } = await req.json();
    if (!code || !name) {
      return NextResponse.json({ ok: false, error: "Code et nom requis" }, { status: 400 });
    }

    const exists = await prisma.store.findUnique({ where: { code } });
    if (exists) {
      return NextResponse.json({ ok: false, error: "Code déjà existant" }, { status: 409 });
    }

    const store = await prisma.store.create({ data: { code, name } });
    return NextResponse.json({ ok: true, store });
  } catch (e) {
    console.error("Erreur POST /admin/stores:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT: modifier une boutique
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id, code, name } = await req.json();
    const updated = await prisma.store.update({
      where: { id },
      data: { code, name },
    });
    return NextResponse.json({ ok: true, store: updated });
  } catch (e) {
    console.error("Erreur PUT /admin/stores:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE: supprimer une boutique
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    await prisma.store.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /admin/stores:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
