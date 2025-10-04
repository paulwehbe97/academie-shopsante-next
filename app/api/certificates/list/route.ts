// app/api/certificates/list/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/db";

/** GET /api/certificates/list
 *  - Auth: JWT-first (getToken)
 *  - Retourne la liste des certificats de l'utilisateur courant (tri desc par date)
 */
export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = String(token.email);
  const userName = typeof token.name === "string" ? token.name : "";
  const storeCode = (token as any)?.storeCode as string | null;
  const storeName = (token as any)?.storeName as string | null;

  // Résout l'utilisateur par email (source stable après reset DB)
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: userName || null,
      role: "Employé",
      storeCode: storeCode || null,
      storeName: storeName || null,
    },
  });

  const items = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json({ ok: true, items });
}
