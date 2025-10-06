// app/api/invites/list/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db"; // ✅ bon import unique

function statusOf(row: any) {
  if (row.acceptedAt) return "accepted";
  if (row.revokedAt) return "revoked";
  return "pending";
}

function isExpired(invitedAt: Date) {
  const expires = new Date(invitedAt.getTime() + 24 * 60 * 60 * 1000);
  return Date.now() > expires.getTime();
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const me = session?.user as any;

    const role: "Employé" | "Gérant" | "Admin" = (me?.role || "Admin") as any;
    const myStore: string | null = me?.storeCode || null;

    const where =
      role === "Admin"
        ? {}
        : myStore
        ? { storeCode: myStore }
        : { id: { in: [] as string[] } };

    const rows = await prisma.inviteLog.findMany({
      where,
      orderBy: { invitedAt: "desc" },
    });

    const invites = rows.map((r: any) => ({
      id: r.jti,
      firstName: r.firstName || "",
      lastName: r.lastName || "",
      email: r.email,
      role: r.role,
      storeCode: r.storeCode,
      storeName: r.storeName,
      hireDate: r.hireDate ? r.hireDate.toISOString().split("T")[0] : null,
      invitedAt: r.invitedAt.toISOString(),
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      status: statusOf(r),
      expired: isExpired(r.invitedAt),
    }));

    return NextResponse.json({ ok: true, invites });
  } catch (err) {
    console.error("❌ Error in /api/invites/list:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
