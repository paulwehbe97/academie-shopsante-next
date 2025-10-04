// app/api/manager/team/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { LEVELS, type LevelKey } from "@/lib/curriculum";

const prisma = new PrismaClient();

const PASS_PCT = 90;

/** Nombre total de sujets d’un niveau (ex. "Niveau 1"). */
function totalSubjects(levelKey: LevelKey) {
  const lvl = LEVELS[levelKey];
  if (!lvl) return 0;
  return lvl.chapters.reduce((n, ch) => n + ch.subjects.length, 0);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const level = (url.searchParams.get("level") || "Niveau 1") as LevelKey;
  const forStore = url.searchParams.get("store")?.trim();

  const role: "Employé" | "Gérant" | "Admin" = (user.role || "Employé") as any;
  const managerStore = (user.storeCode || "").trim();

  // Détermine la boutique cible selon le rôle
  const targetStore =
    role === "Admin" ? (forStore || managerStore || undefined) : managerStore;

  if (!targetStore) {
    return NextResponse.json({ ok: false, error: "No store for manager" }, { status: 400 });
  }

  // 1) Récupère les employés de la boutique
  const users = await prisma.user.findMany({
    where: {
      storeCode: targetStore,
      // On affiche les employés ; si tu veux inclure les gérants, enlève cette ligne.
      role: "Employé",
    },
    select: {
      id: true,
      name: true,
      email: true,
      storeCode: true,
      storeName: true,
      lastReminderAt: true,
      // Ajoute ce champ dans Prisma si tu veux tracer les relances (étape 3)
      // lastReminderAt: true,
    },
    orderBy: { name: "asc" },
  });

  const userIds = users.map((u: any) => u.id);
  const rows = userIds.length
    ? await prisma.progress.findMany({
        where: { userId: { in: userIds }, levelKey: level },
        select: { userId: true, pct: true, updatedAt: true },
      })
    : [];

  // 2) Agrège le progrès par user
  const total = totalSubjects(level);
  const byUser: Record<
    string,
    { done: number; lastActive?: Date }
  > = {};
  for (const r of rows) {
    const b = (byUser[r.userId] ||= { done: 0, lastActive: undefined });
    if (r.pct >= PASS_PCT) b.done += 1;
    if (!b.lastActive || r.updatedAt > b.lastActive) b.lastActive = r.updatedAt;
  }

  const team = users.map((u: any) => {
    const agg = byUser[u.id] || { done: 0, lastActive: undefined };
    const pct = total === 0 ? 0 : Math.round((agg.done / total) * 100);
    return {
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      storeCode: u.storeCode || "",
      storeName: u.storeName || "",
      progress: { pct, done: agg.done, total },
      lastActive: agg.lastActive ? agg.lastActive.toISOString() : null,
      lastReminderAt: u.lastReminderAt ? u.lastReminderAt.toISOString() : null,
    };
  });

  return NextResponse.json({ ok: true, data: { team, level, storeCode: targetStore } });
}
