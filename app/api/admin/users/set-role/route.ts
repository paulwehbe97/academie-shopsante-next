// app/api/admin/users/set-role/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

const ALLOWED_ROLES = ["Employé", "Gérant", "Admin"] as const;
type Role = (typeof ALLOWED_ROLES)[number];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    let { email, role }: { email?: string; role?: Role } = body;

    email = (email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email requis" }, { status: 400 });
    }
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ ok: false, error: "Rôle invalide" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: role as any },
      create: { email, role: role as any },
      select: { id: true, email: true, role: true, name: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
