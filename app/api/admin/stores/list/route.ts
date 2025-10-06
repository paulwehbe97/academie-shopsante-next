// app/api/admin/stores/list/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { STORES } from "@/data/stores"; // ✅ ton fichier local déjà présent

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user as any;

    if (!me?.email || me.role !== "Admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // ✅ on renvoie simplement la liste statique des boutiques
    return NextResponse.json({ ok: true, stores: STORES });
  } catch (e: any) {
    console.error("Error fetching stores:", e);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
