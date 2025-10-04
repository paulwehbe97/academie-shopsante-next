import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyInvite, peekInviteId, isInviteRevoked, consumeInvite } from "@/lib/invite";

// Shared provisioning used by both POST and GET
async function provision(token: string | null | undefined) {
  const t = (token || "").toString();
  if (!t) return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });

  const decoded = verifyInvite(t);
  if (!decoded?.email) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 400 });
  }

  const jti = decoded.jti || peekInviteId(t);
  if (!jti) {
    return NextResponse.json({ ok: false, error: "corrupt_invite_no_jti" }, { status: 400 });
  }
  if (await isInviteRevoked(jti)) {
    return NextResponse.json({ ok: false, error: "invite_revoked" }, { status: 403 });
  }

  const email = String(decoded.email).toLowerCase().trim();
  const role = (decoded.role as any) ?? "Employé";
  const storeCode = decoded.storeCode ?? null;
  const storeName = decoded.storeName ?? null;

  // Upsert user with invited email (no password here)
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, storeCode, storeName },
    create: { email, role, storeCode, storeName },
    select: { id: true, email: true, role: true, storeCode: true, storeName: true },
  });

  // Mark invite consumed + log acceptedAt
  await consumeInvite(jti);
  await prisma.inviteLog.updateMany({
    where: { jti, acceptedAt: null },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true, user });
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json().catch(() => ({}));
    return provision(token);
  } catch (e) {
    console.error("[api/register/sso-provision] error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    return provision(token);
  } catch (e) {
    console.error("[api/register/sso-provision][GET] error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
