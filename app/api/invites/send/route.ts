// app/api/invites/send/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { signInvite } from "@/lib/invite";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "Académie <no-reply@example.com>";

export async function POST(req: Request) {
  try {
    console.log("🟡 /api/invites/send — Début du POST");

    const session = await getServerSession(authOptions);
    const sender = session?.user?.email || EMAIL_FROM;
    console.log("Session détectée:", sender);

    const body = await req.json();
    console.log("Body reçu:", body);

    const {
      to,
      firstName = "",
      lastName = "",
      role = "Employé",
      storeCode = "",
      storeName = "",
      hireDate,
      jti,
      ttlHours = 24,
    } = body || {};

    if (!to || typeof to !== "string") {
      console.error("❌ Champ 'to' manquant ou invalide");
      return NextResponse.json({ ok: false, error: "Email requis." }, { status: 400 });
    }

    console.log("🟢 Étape 1: génération du token...");
    const token = await signInvite({
      email: to,
      role,
      storeCode,
      storeName,
      ttlHours,
      jti,
    });
    console.log("✅ Token généré avec succès.");

    const signupUrl = `${APP_URL}/signup?token=${encodeURIComponent(token)}`;
    console.log("URL d'inscription:", signupUrl);

    console.log("🟢 Étape 2: configuration du transport SMTP...");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // STARTTLS (obligatoire pour Gmail)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log("✅ Transporter SMTP prêt.");

    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.5">
        <p>Bonjour ${firstName} ${lastName},</p>
        <p>Vous êtes invité(e) à rejoindre l’Académie Shop Santé.</p>
        <p><a href="${signupUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none">Créer mon accès</a></p>
        <p>Ce lien est valide ${ttlHours}h. Boutique : <b>${storeName || storeCode}</b></p>
        <p>Date d'embauche prévue : ${hireDate ? new Date(hireDate).toLocaleDateString("fr-CA") : "Non spécifiée"}</p>
        <p>Si le bouton ne fonctionne pas, copiez-collez ce lien :<br>${signupUrl}</p>
      </div>
    `;

    console.log("🟢 Étape 3: envoi du courriel...");
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject: "Invitation — Académie Shop Santé",
      html,
      text: `Invitation Académie Shop Santé\n\nLien: ${signupUrl}\nValide ${ttlHours}h\n`,
    });
    console.log("✅ Email envoyé à:", to);

    console.log("🟢 Étape 4: enregistrement InviteLog...");
    if (jti) {
      await prisma.inviteLog.update({
        where: { jti },
        data: {
          invitedAt: new Date(),
          acceptedAt: null,
          revokedAt: null,
          firstName,
          lastName,
          hireDate: hireDate ? new Date(hireDate) : null,
        },
      });
      console.log("InviteLog mis à jour (renvoi).");
    } else {
      const payload = JSON.parse(atob(token.split(".")[1]));
      await prisma.inviteLog.create({
        data: {
          jti: payload.jti,
          email: to,
          role,
          storeCode,
          storeName,
          invitedBy: sender,
          firstName,
          lastName,
          hireDate: hireDate ? new Date(hireDate) : null,
          invitedAt: new Date(),
        },
      });
      console.log("InviteLog créé avec succès.");
    }

    console.log("✅ /api/invites/send — Terminé avec succès !");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("❌ invites/send error:", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur." }, { status: 500 });
  }
}
