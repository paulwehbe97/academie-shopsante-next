// app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import {
  verifyInvite,
  peekInviteId,
  isInviteRevoked,
  consumeInvite,
} from "@/lib/invite";

function isStrong(pwd: string) {
  // ≥8 caractères + 1 majuscule + 1 chiffre
  return typeof pwd === "string" && pwd.length >= 8 && /[A-Z]/.test(pwd) && /\d/.test(pwd);
}

/**
 * POST /api/register
 * body: { token: string, password: string }
 *
 * - Vérifie le jeton d’invitation (24h)
 * - Refuse si RÉVOQUÉ (RevokedInvite via jti)
 * - Création/upsert avec rôle & store du token si fournis
 * - Marque l’invitation comme consommée (RevokedInvite) + acceptedAt dans InviteLog
 */
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json().catch(() => ({}));
    if (!token || !password) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }

    // 1) Jeton OK ?
    const decoded = verifyInvite(token);
    if (!decoded?.email) {
      return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 400 });
    }

    // 2) Récup jti et vérif révocation
    const jti = decoded.jti || peekInviteId(token);
    if (!jti) {
      return NextResponse.json({ ok: false, error: "corrupt_invite_no_jti" }, { status: 400 });
    }
    if (await isInviteRevoked(jti)) {
      return NextResponse.json({ ok: false, error: "invite_revoked" }, { status: 403 });
    }

    // 3) Mot de passe fort ?
    if (!isStrong(password)) {
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    }

    const email = String(decoded.email).toLowerCase().trim();

    // 4) Usage unique: si un hash existe déjà -> lien déjà consommé
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return NextResponse.json({ ok: false, error: "already_registered" }, { status: 409 });
    }

    // 5) Hash + upsert avec infos du token (si présentes)
    const passwordHash = await bcrypt.hash(password, 12);

    const role = (decoded.role as any) ?? existing?.role ?? "Employé";
    const storeCode = (decoded.storeCode ?? existing?.storeCode) ?? null;
    const storeName = (decoded.storeName ?? existing?.storeName) ?? null;

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role, storeCode, storeName },
      create: { email, passwordHash, role: role as any, storeCode, storeName },
      // ⬇️ Retrait de `createdAt` qui n’existe pas dans ton modèle User
      select: { id: true, email: true, role: true, storeCode: true, storeName: true },
    });

    // 6) Marquer l’invite comme consommée (idempotent) + InviteLog.acceptedAt
    await consumeInvite(jti);
    await prisma.inviteLog.updateMany({
      where: { jti, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (e) {
    console.error("[api/register] error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
