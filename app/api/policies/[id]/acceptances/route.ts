// app/api/policies/[id]/acceptances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db"; // ✅ ton projet exporte une instance par défaut

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    // ✅ correction principale : getServerSession
    const session = await getServerSession(authOptions as any);
    const role = ((session as any)?.user)?.role ?? "Employé";
    const isAdminOrManager = role === "Admin" || role === "Gérant";
    if (!isAdminOrManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: policyId } = params;

    const rows = await prisma.policyAcceptance.findMany({
      where: { policyId },
      orderBy: { acceptedAt: "desc" },
      include: {
        user: {
          select: { email: true, role: true, storeCode: true, storeName: true },
        },
      },
    });

    const acceptances = rows.map((r: any) => ({
      fullName: r.fullName ?? "",
      email: r.user?.email ?? "",
      role: r.user?.role ?? "",
      storeCode: r.user?.storeCode ?? null,
      storeName: r.user?.storeName ?? null,
      acceptedAt: r.acceptedAt,
      ip: r.ip ?? null,
      userAgent: r.userAgent ?? null,
    }));

    return NextResponse.json({ acceptances });
  } catch (err) {
    console.error("GET /api/policies/:id/acceptances error", err);
    return NextResponse.json(
      { error: "Unable to list acceptances" },
      { status: 500 }
    );
  }
}
