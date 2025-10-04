// app/api/manager/employee/[id]/chapter-stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { LEVELS } from "@/lib/curriculum";

const prisma = new PrismaClient();
const PASS_PCT = 90;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const managerRole: "Employé" | "Gérant" | "Admin" = (user.role || "Employé") as any;
  const managerStore = (user.storeCode || "").trim();

  const employeeId = params.id;
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "Missing employee id" }, { status: 400 });
  }

  // 1) Récupérer l’employé + garde boutique si Gérant
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: { id: true, email: true, storeCode: true, storeName: true },
  });
  if (!employee) {
    return NextResponse.json({ ok: false, error: "Employee not found" }, { status: 404 });
  }
  if (managerRole === "Gérant" && managerStore && employee.storeCode && managerStore !== employee.storeCode) {
    return NextResponse.json({ ok: false, error: "Forbidden (store mismatch)" }, { status: 403 });
  }

  // 2) Récupérer toute la progression (tous niveaux), puis on agrège
  const rows = await prisma.progress.findMany({
    where: { userId: employeeId },
    select: { moduleCode: true, levelKey: true, pct: true, updatedAt: true },
  });

  // 3) Construire stats par chapitre pour le "Niveau 1"
  const levelKey: keyof typeof LEVELS = "Niveau 1";
  const level = LEVELS[levelKey];
  const stats: Array<{
    chapterNo: number;
    title: string;
    completed: number;
    total: number;
    pct: number;
    lastActive?: string | null;
  }> = [];

  for (const ch of level.chapters) {
    const total = ch.subjects.length;
    let completed = 0;
    let lastActive: Date | undefined;

    for (const s of ch.subjects) {
      const code1 = `${ch.id}_${s.id}`;   // ex: "1_vitamines" ✅ format actuel
      const code2 = `${ch.id}::${s.id}`;  // tolérance si ancien format

      // ✅ typage explicite pour supprimer l’erreur
      const hit = rows.find((r: any) =>
        r.levelKey === levelKey && (r.moduleCode === code1 || r.moduleCode === code2)
      );

      if (hit && hit.pct >= PASS_PCT) completed++;
      if (hit && (!lastActive || hit.updatedAt > lastActive)) lastActive = hit.updatedAt;
    }

    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    stats.push({
      chapterNo: Number(ch.id),
      title: ch.title,
      completed,
      total,
      pct,
      lastActive: lastActive ? lastActive.toISOString() : null,
    });
  }

  // 4) Dernière activité globale (max)
let lastActiveGlobal: Date | null = null;
for (const r of rows as any[]) {
  if (!lastActiveGlobal || r.updatedAt > lastActiveGlobal) {
    lastActiveGlobal = r.updatedAt;
  }
}


  return NextResponse.json({
    ok: true,
    data: {
      employeeId,
      storeCode: employee.storeCode,
      storeName: employee.storeName,
      level: levelKey,
      lastActive: lastActiveGlobal ? lastActiveGlobal.toISOString() : null,
      chapters: stats.sort((a, b) => a.chapterNo - b.chapterNo),
    },
  });
}
