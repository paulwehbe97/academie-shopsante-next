// app/api/admin/employees/list/route.ts
export const dynamic = "force-dynamic";


import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: "Employé" },
      include: {
        progresses: true, // ✅ relation correcte (pluriel)
      },
      orderBy: { lastName: "asc" },
    });

    // Transformation pour l’UI
    const formatted = users.map((u: any) => {
      const progress = u.progresses;

      // Calcul du pourcentage moyen
      const pct =
        progress.length > 0
          ? Math.round(
              progress.reduce((sum: number, p: any) => sum + (p.pct || 0), 0) /
                progress.length
            )
          : 0;

      // Nombre de modules réussis (pct >= 90)
      const completed = progress.filter((p: any) => p.pct >= 90).length;

      // Total de modules tentés
      const total = progress.length;

      // Dernière activité = le plus récent updatedAt
      const lastActive =
        progress.length > 0
          ? progress.reduce(
              (latest: Date, p: any) =>
                p.updatedAt > latest ? p.updatedAt : latest,
              progress[0].updatedAt
            )
          : null;

      return {
        id: u.id,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email,
        storeCode: u.storeCode,
        storeName: u.storeName || "",
        hireDate: u.hireDate,
        progressPct: pct,
        completed,
        total,
        lastActive,
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("Erreur API employees/list:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
