// app/api/admin/stats/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db"; // ✅ Singleton Prisma (corrige le bug Vercel)

const PASS_PCT = 90;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // ✅ Vérifie la session et le rôle
    if (!session || session.user.role !== "Admin") {
      return NextResponse.json(
        { ok: false, error: "Non autorisé" },
        { status: 401 }
      );
    }

    // ✅ Lecture des utilisateurs et de leur progression
    const users = await prisma.user.findMany({
      where: { role: { in: ["Employé", "Gérant"] } },
      include: { progresses: true },
    });

    const totalUsers = users.length;

    // ✅ Moyenne de complétion globale
    let totalPct = 0;
    let totalProgress = 0;

    for (const user of users) {
      for (const prog of user.progresses) {
        if (typeof prog.pct === "number") {
          totalPct += prog.pct;
          totalProgress++;
        }
      }
    }

    const avgCompletion = totalProgress
      ? Math.round(totalPct / totalProgress)
      : 0;

    // ✅ Cas "en retard" (créés il y a plus de 30 jours sans Niveau 1 complété)
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - 30);

    const lateUsers = users.filter((u: any) => {
      if (!u.createdAt) return false;
      const over30days = u.createdAt <= threshold;
      const n1Progress = u.progresses.filter((p: any) => p.levelKey === "N1");
      const n1Completed = n1Progress.every((p: any) => p.pct >= PASS_PCT);
      return over30days && !n1Completed;
    }).length;

    // ✅ Retour JSON
    return NextResponse.json({
      ok: true,
      data: { totalUsers, avgCompletion, lateUsers },
    });
  } catch (e: any) {
    console.error("Error fetching admin stats:", e);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
