import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET() {
  const session = (await getServerSession(authOptions)) as any;
  const role = session?.user?.role;
  const email = session?.user?.email;

  if (!email || (role !== "Admin" && role !== "Gérant")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const totalEmployees = await prisma.user.count({
    where: { role: "Employé" },
  });

  return NextResponse.json({ ok: true, totalEmployees });
}
