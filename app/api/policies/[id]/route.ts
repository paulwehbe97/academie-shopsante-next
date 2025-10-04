// app/api/policies/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { removePolicyFile } from "@/lib/policyStorage";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  return session?.user?.role === "Admin" || session?.user?.role === "Gérant";
}

// DELETE /api/policies/:id
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions as any);
  if (!isAdmin(session)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const doc = await prisma.policyDoc.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await prisma.$transaction([
    prisma.policyAcceptance.deleteMany({ where: { policyId: doc.id } }),
    prisma.policyDoc.delete({ where: { id: doc.id } }),
  ]);

  await removePolicyFile(doc.fileKey).catch(() => {});
  return NextResponse.json({ ok: true });
}
