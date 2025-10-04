// app/api/reminders/send/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

/** Transport SMTP — on réutilise ta logique existante */
function makeTransport() {
  if (process.env.EMAIL_SERVER) {
    return nodemailer.createTransport(process.env.EMAIL_SERVER as any);
  }
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  return nodemailer.createTransport({
    host, port, secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

type Payload = {
  to: string;               // destinataire (email employé)
  name?: string;            // nom complet (optionnel)
  daysInactive?: number;    // nb de jours d'inactivité (optionnel)
  storeCode?: string;       // code boutique (obligatoire pour Gérant)
  storeName?: string;       // nom boutique (optionnel)
  levelComplete?: boolean;  // si Niveau 1 terminé → on n'envoie PAS
};

export async function POST(req: Request) {
  // 1) Auth + rôles
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role as "Employé" | "Gérant" | "Admin" | undefined;
  const managerStore = (session.user as any).storeCode as string | undefined;
  if (role !== "Admin" && role !== "Gérant") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // 2) Payload
  let body: Payload | null = null;
  try { body = await req.json(); } catch {}
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const to = (body.to || "").trim().toLowerCase();
  const name = (body.name || "collègue").trim();
  const days = Number(body.daysInactive ?? NaN);
  const storeCode = (body.storeCode || "").trim();
  const storeName = (body.storeName || storeCode || "").trim();
  const levelComplete = !!body.levelComplete;

  if (!to) return NextResponse.json({ ok: false, error: "Missing 'to' email" }, { status: 400 });
  if (role === "Gérant") {
    // Un gérant ne peut relancer que sa boutique
    if (!managerStore || !storeCode || managerStore !== storeCode) {
      return NextResponse.json({ ok: false, error: "Store mismatch" }, { status: 403 });
    }
  }
  if (levelComplete) {
    // Règle métier : on ne relance pas un niveau déjà complété
    return NextResponse.json({ ok: true, skipped: "level-complete" });
  }

  // 3) Envoi email
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@shopsante.local";
  const transporter = makeTransport();

  const subject = `Rappel — Académie Shop Santé (${storeCode || "Boutique"})`;
  const intro = Number.isFinite(days)
    ? `Nous avons remarqué une période d’inactivité d’environ ${days} jours.`
    : `Nous avons remarqué une période d’inactivité récente.`;

  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3002") + "/employee";

  const text = [
    `Bonjour ${name},`,
    ``,
    `${intro}`,
    `Nous t’invitons à te reconnecter à l’Académie Shop Santé pour poursuivre ta formation.`,
    ``,
    `Lien : ${appUrl}`,
    ``,
    `${storeName || storeCode}`,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
      <p>Bonjour <b>${name}</b>,</p>
      <p>${intro}</p>
      <p>Nous t’invitons à te reconnecter à l’<b>Académie Shop Santé</b> pour poursuivre ta formation.</p>
      <p>
        <a href="${appUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none">
          Ouvrir l’académie
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px">${storeName || storeCode}</p>
    </div>
  `;

  try {
    await transporter.sendMail({ from, to, subject, text, html });

    // 4) ✅ Persiste la date de relance côté DB
    await prisma.user.update({
      where: { email: to },
      data: { lastReminderAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[reminders/send] error:", err?.message || err);
    return NextResponse.json({ ok: false, error: "Send failed" }, { status: 500 });
  }
}
