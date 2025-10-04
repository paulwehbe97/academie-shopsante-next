// app/api/admin/employees/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions)) as any; // ✅ typage forcé
  const user = session?.user;

  if (!user || user.role !== 'Admin') {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const storeCodes = url.searchParams.getAll('storeCode').filter(Boolean);

    const users = await prisma.user.findMany({
      where: storeCodes.length ? { storeCode: { in: storeCodes } } : undefined,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        storeCode: true,
        storeName: true,
        // ✅ tu as raison : pas de createdAt/hiredAt ici
      },
      orderBy: [{ storeName: 'asc' }, { lastName: 'asc' }],
    });

    const data = await Promise.all(
  users.map(async (u: any) => {
        const [aggN1, aggAll] = await Promise.all([
          prisma.progress.aggregate({
            where: { userId: u.id, levelKey: 'N1' },
            _avg: { pct: true },
            _max: { updatedAt: true },
          }),
          prisma.progress.aggregate({
            where: { userId: u.id },
            _avg: { pct: true },
            _max: { updatedAt: true },
          }),
        ]);

        const pctN1 =
          typeof aggN1._avg.pct === 'number'
            ? Math.round(aggN1._avg.pct)
            : typeof aggAll._avg.pct === 'number'
            ? Math.round(aggAll._avg.pct)
            : 0;

        const lastProgressAt =
          aggAll._max.updatedAt ?? aggN1._max.updatedAt ?? null;

        return {
          id: u.id,
          email: u.email ?? '',
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          role: u.role ?? '',
          storeCode: u.storeCode ?? null,
          storeName: u.storeName ?? null,
          hiredAt: new Date().toISOString(), // placeholder temporaire
          pctN1,
          lastProgressAt: lastProgressAt
            ? lastProgressAt.toISOString()
            : undefined,
        };
      })
    );

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error('Erreur /admin/employees:', e);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
