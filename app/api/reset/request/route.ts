import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

const SMTP = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || "465"),
  user: process.env.SMTP_USER || "",
  pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  from: process.env.EMAIL_FROM || process.env.SMTP_USER || "",
};
const SMTP_SECURE = SMTP.port === 465;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const identifier = (email || "").toLowerCase().trim();
    if (!identifier) return new NextResponse("Email manquant.", { status: 400 });

    // Vérifie l'existence du user (réponse générique même si absent)
    const user = await prisma.user.findUnique({ where: { email: identifier } });

    // Toujours répondre OK pour ne pas divulguer l’existence
    if (!user) return NextResponse.json({ ok: true });

    // Génère un token (1h de validité)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Enregistre dans la table NextAuth VerificationToken
    await prisma.verificationToken.create({
      data: { identifier, token, expires },
    });

    // Compose et envoie le courriel
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002";
    const resetUrl = `${baseUrl}/reset/confirm?token=${encodeURIComponent(token)}`;

    const transport = nodemailer.createTransport({
      host: SMTP.host,
      port: SMTP.port,
      secure: SMTP_SECURE,
      auth: SMTP.user && SMTP.pass ? { user: SMTP.user, pass: SMTP.pass } : undefined,
    });
    await transport.verify();

    await transport.sendMail({
      to: identifier,
      from: SMTP.from,
      subject: "Réinitialisation du mot de passe — Académie Shop Santé",
      text: `Pour créer un nouveau mot de passe, ouvrez ce lien : ${resetUrl}\n\nCe lien expire dans 1 heure.`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
          <h2>Académie Shop Santé</h2>
          <p>Cliquez sur le bouton pour créer un nouveau mot de passe :</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none">Créer un nouveau mot de passe</a></p>
          <p style="margin-top:12px">Ou copiez/collez ce lien :<br><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color:#6b7280;font-size:12px">Ce lien expire dans 1 heure.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Erreur serveur.", { status: 500 });
  }
}
