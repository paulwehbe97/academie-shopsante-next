// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PASS_PCT = 90;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "Admin") {
    return NextResponse.json(
      { ok: false, error: "Non autorisé" },
      { status: 401 }
    );
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ["Employé", "Gérant"] } },
    include: { progresses: true },
  });

  const totalUsers = users.length;

  // Moyenne complétion
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

  // Cas en retard (30j après création sans Niveau 1 complété)
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(now.getDate() - 30);

  const lateUsers = users.filter((u: any) => {
    if (!u.createdAt) return false; // au cas où
    const over30days = u.createdAt <= threshold;
    const n1Progress = u.progresses.filter((p: any) => p.levelKey === "N1"); // ✅ typé
    const n1Completed = n1Progress.every((p: any) => p.pct >= PASS_PCT); // ✅ typé
    return over30days && !n1Completed;
  }).length;

  return NextResponse.json({
    ok: true,
    data: { totalUsers, avgCompletion, lateUsers },
  });
}
