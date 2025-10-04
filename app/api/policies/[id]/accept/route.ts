// app/api/policies/[id]/accept/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/policies/:id/accept
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions as any);
    const email = (session as any)?.user?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const policyId = params.id;
    if (!policyId) {
      return NextResponse.json({ ok: false, error: "missing_policy_id" }, { status: 400 });
    }

    // 1) Vérifie si le document existe
    const policy = await prisma.policyDoc.findUnique({
      where: { id: policyId },
      select: { id: true },
    });
    if (!policy) {
      return NextResponse.json({ ok: false, error: "policy_not_found" }, { status: 404 });
    }

    // 2) Trouve ou crée l’utilisateur par email
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { email, role: "Employé" as any },
        select: { id: true },
      });
    }

    // 3) Lecture du corps (nom complet)
    const body = await req.json().catch(() => ({}));
    const fullName = String(body?.fullName || "").trim();
    if (fullName.length < 3) {
      return NextResponse.json({ ok: false, error: "invalid_fullname" }, { status: 400 });
    }

    // 4) Métadonnées
    const headers = new Headers(req.headers);
    const fwd = headers.get("x-forwarded-for") || "";
    const ip = fwd.split(",").map((s) => s.trim()).filter(Boolean)[0] || "unknown";
    const userAgent = headers.get("user-agent") || "unknown";

    // 5) Enregistre ou met à jour l’acceptation
    const saved = await prisma.policyAcceptance.upsert({
      where: { policyId_userId: { policyId, userId: user.id } },
      update: { fullName, acceptedAt: new Date(), ip, userAgent },
      create: { policyId, userId: user.id, fullName, ip, userAgent },
      select: {
        id: true,
        policyId: true,
        userId: true,
        acceptedAt: true,
        fullName: true,
      },
    });

    return NextResponse.json({ ok: true, acceptance: saved }, { status: 201 });
  } catch (e) {
    console.error("[policies/:id/accept] error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// GET /api/policies/:id/accept → liste des acceptations (Admin/Gérant)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions as any);
  const user = (session as any)?.user;
  const role = user?.role;

  if (!user?.email || (role !== "Admin" && role !== "Gérant")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const policy = await prisma.policyDoc.findUnique({
    where: { id: params.id },
    select: { id: true, title: true },
  });
  if (!policy) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const rows = await prisma.policyAcceptance.findMany({
    where: { policyId: params.id },
    orderBy: { acceptedAt: "desc" },
    select: {
      fullName: true,
      acceptedAt: true,
      ip: true,
      userAgent: true,
      user: { select: { email: true } },
    },
  });

  const items = rows.map((r: any) => ({
    fullName: r.fullName,
    email: r.user?.email ?? "",
    acceptedAt: r.acceptedAt.toISOString(),
    ip: r.ip ?? "",
    userAgent: r.userAgent ?? "",
  }));

  return NextResponse.json({
    ok: true,
    policy: { id: policy.id, title: policy.title },
    items,
  });
}
