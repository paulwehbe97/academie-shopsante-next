// app/api/admin/invite/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { sendInviteEmail, signInvite } from '@/lib/invites'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'Admin') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { firstName, lastName, email, role, storeCode, storeName, hiredAt } = body

  if (!firstName || !lastName || !email || !role) {
    return NextResponse.json({ ok: false, error: 'Champs requis manquants' }, { status: 400 })
  }

  // ✅ Correction de typage : on étend avec "as any" pour ignorer les clés supplémentaires
  const token = await signInvite({
    email,
    role,
    storeCode,
    ...( { firstName, lastName, storeName, hiredAt } as any )
  })

  const link = `${process.env.NEXTAUTH_URL}/signup?token=${token}`

  await sendInviteEmail( email, link )

await prisma.inviteLog.create({
  data: {
    jti: JSON.parse(Buffer.from((token.token as string).split('.')[1], 'base64').toString()).jti,
    email,
    firstName,
    lastName,
    storeCode,
    storeName,
    invitedAt: new Date(),
    role,
  },
});


  return NextResponse.json({ ok: true })
}
