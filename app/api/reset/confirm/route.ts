import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || typeof password !== "string") {
      return new NextResponse("Requête invalide.", { status: 400 });
    }

    // Politique: ≥8, ≥1 majuscule, ≥1 chiffre
    const strong = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
    if (!strong) {
      return new NextResponse("Exigences: min. 8 caractères, ≥1 majuscule, ≥1 chiffre.", { status: 400 });
    }

    // Vérifie le token (table NextAuth)
    const vt = await prisma.verificationToken.findUnique({ where: { token } });
    if (!vt) return new NextResponse("Lien invalide.", { status: 400 });
    if (vt.expires.getTime() < Date.now()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return new NextResponse("Lien expiré.", { status: 400 });
    }

    // Met à jour le mot de passe du user correspondant
    const email = vt.identifier.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Nettoie le token orphelin
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return new NextResponse("Compte introuvable.", { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
    });

    // Consomme le token (one-time)
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Erreur serveur.", { status: 500 });
  }
}
