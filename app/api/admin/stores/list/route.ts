// app/api/admin/stores/list/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // ✅ utilise ton db.ts existant
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user as any;

    if (!me?.email || me.role !== "Admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, stores });
  } catch (e: any) {
    console.error("Error fetching stores:", e);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
