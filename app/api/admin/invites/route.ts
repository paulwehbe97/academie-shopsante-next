// app/api/admin/invites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'Admin') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const storeCode = url.searchParams.get('storeCode') || undefined

  const invites = await prisma.inviteLog.findMany({
    where: storeCode ? { storeCode } : undefined,
    orderBy: { invitedAt: 'desc' }
  })

  const now = new Date()

  const result = invites.map((invite: any) => {
    const expired = invite.status === 'pending' &&
      new Date(invite.invitedAt).getTime() + 24 * 60 * 60 * 1000 < now.getTime()

    return { ...invite, expired }
  })

  return NextResponse.json({ ok: true, data: result })
}
