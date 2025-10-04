// app/api/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/db"; // utilise ton client partagé

/** GET: renvoie la progression de l'utilisateur courant */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token as any)?.sub;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.progress.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const map: Record<
    string,
    {
      pct: number;
      watched: boolean;
      attempts: number;
      levelKey: string;
      chapterId: string;
      updatedAt: string;
    }
  > = {};

  for (const r of rows) {
    map[r.moduleCode] = {
      pct: r.pct,
      watched: r.watched,
      attempts: r.attempts,
      levelKey: r.levelKey,
      chapterId: r.chapterId,
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  return NextResponse.json({ ok: true, data: map });
}

/** POST: upsert d’un ou plusieurs enregistrements de progression */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token as any)?.sub;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body];

  // nettoyage minimal
  const payload = items
    .map((i: any) => ({
      moduleCode: String(i.moduleCode || "").trim(),
      levelKey: String(i.levelKey || "").trim(),
      chapterId: String(i.chapterId || "").trim(),
      watched: Boolean(i.watched),
      attempts: Number.isFinite(i.attempts) ? Math.max(0, Math.floor(i.attempts)) : 0,
      pct: Number.isFinite(i.pct) ? Math.max(0, Math.min(100, Math.floor(i.pct))) : 0,
      lastAttemptAt: i.lastAttemptAt ? new Date(i.lastAttemptAt) : null,
    }))
    .filter((x) => x.moduleCode && x.levelKey && x.chapterId);

  if (payload.length === 0) {
    return NextResponse.json({ ok: false, error: "Empty payload" }, { status: 400 });
  }

  // upsert (évite les doublons)
  const MAX = 50;
  const batch = payload.slice(0, MAX).map((row) =>
    prisma.progress.upsert({
      where: { userId_moduleCode: { userId, moduleCode: row.moduleCode } },
      update: {
        watched: row.watched,
        attempts: row.attempts,
        pct: row.pct,
        lastAttemptAt: row.lastAttemptAt || undefined,
        levelKey: row.levelKey,
        chapterId: row.chapterId,
      },
      create: {
        userId,
        moduleCode: row.moduleCode,
        levelKey: row.levelKey,
        chapterId: row.chapterId,
        watched: row.watched,
        attempts: row.attempts,
        pct: row.pct,
        lastAttemptAt: row.lastAttemptAt || undefined,
      },
      select: { moduleCode: true, pct: true, watched: true, attempts: true, updatedAt: true },
    })
  );

  const res = await Promise.all(batch);
  const out = Object.fromEntries(
    res.map((r) => [
      r.moduleCode,
      { pct: r.pct, watched: r.watched, attempts: r.attempts, updatedAt: r.updatedAt.toISOString() },
    ])
  );

  return NextResponse.json({ ok: true, data: out });
}
