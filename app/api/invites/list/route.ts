// app/api/invites/list/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const rows = await prisma.inviteLog.findMany({
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json({ ok: true, invites: rows });
  } catch (err) {
    console.error("❌ Error in /api/invites/list (test):", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
