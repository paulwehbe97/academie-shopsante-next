import { NextResponse } from "next/server";
import { verifyInvite, peekInviteId, isInviteRevoked } from "@/lib/invite";

// Shared verifier used by both POST and GET
async function verifyToken(token: string | null | undefined) {
  const t = (token || "").toString();
  if (!t) return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });

  const payload = verifyInvite(t);
  if (!payload?.email) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 400 });
  }

  const jti = payload.jti || peekInviteId(t);
  if (!jti) {
    return NextResponse.json({ ok: false, error: "corrupt_invite_no_jti" }, { status: 400 });
  }
  if (await isInviteRevoked(jti)) {
    return NextResponse.json({ ok: false, error: "invite_revoked" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    email: String(payload.email).toLowerCase(),
    role: payload.role ?? "Employé",
    storeCode: payload.storeCode ?? null,
    storeName: payload.storeName ?? null,
    jti,
  });
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json().catch(() => ({}));
    return verifyToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    return verifyToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
