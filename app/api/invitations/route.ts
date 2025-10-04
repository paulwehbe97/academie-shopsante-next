import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signInvite } from "@/lib/invite";

// Reprend la même config SMTP que lib/auth.ts
const SMTP = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || "465"),
  user: process.env.SMTP_USER || "",
  pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  from: process.env.EMAIL_FROM || process.env.SMTP_USER || "",
};
const SMTP_SECURE = SMTP.port === 465; // 465 = SSL

// Utilitaire : origine du site (NEXTAUTH_URL prioritaire)
function siteOrigin(fallback: string) {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.SITE_URL ||
    fallback
  ).replace(/\/+$/, "");
}

// Validation email basique
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    // Autoriser uniquement Admin/Gérant
    if (!session?.user || !role || (role !== "Admin" && role !== "Gérant")) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").toLowerCase().trim();
    const inviteRole = (body?.role as "Employé" | "Gérant" | "Admin" | undefined) ?? "Employé";
    const storeCode = (body?.storeCode as string | null | undefined) ?? null;
    const storeName = (body?.storeName as string | null | undefined) ?? null;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    // 1) Génère le jeton (24 h)
const token = await signInvite({ email, role: inviteRole, storeCode, storeName }); // <-- await
const origin = siteOrigin(new URL(req.url).origin);
const signupUrl = `${origin}/signup?token=${encodeURIComponent(token)}`;

// 2) Envoi du courriel
const transport = nodemailer.createTransport({
  host: SMTP.host,
  port: SMTP.port,
  secure: SMTP_SECURE,
  auth: SMTP.user && SMTP.pass ? { user: SMTP.user, pass: SMTP.pass } : undefined,
});


    // Optionnel mais utile en dev
    await transport.verify().catch((e) => {
      console.error("[invite][smtp verify] fail:", e?.message || e);
      throw e;
    });

    const subject = "Invitation — Académie Shop Santé";
    const text = `Bonjour,

Vous avez été invité à créer votre accès à l’Académie Shop Santé.

Créez votre mot de passe ici (lien valide 24 h) :
${signupUrl}

Si le bouton ne fonctionne pas, copiez/collez l’URL ci-dessus dans votre navigateur.
`;
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
        <p>Bonjour,</p>
        <p>Vous avez été invité à créer votre accès à l’Académie Shop Santé.</p>
        <p>
          <a href="${signupUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none">
            Créer mon mot de passe
          </a>
        </p>
        <p style="margin-top:12px">Ou copiez/collez ce lien&nbsp;:<br>
          <a href="${signupUrl}">${signupUrl}</a>
        </p>
        <p style="color:#6b7280;font-size:12px">Lien valable 24 heures.</p>
      </div>
    `;

    const info = await transport.sendMail({
      to: email,
      from: SMTP.from,
      subject,
      text,
      html,
    });

    // Réponse (en dev, on peut renvoyer le lien pour tests)
    const devPayload =
      process.env.NODE_ENV === "development"
        ? { previewSignupUrl: signupUrl, messageId: (info as any)?.messageId }
        : {};

    return NextResponse.json({ ok: true, ...devPayload });
  } catch (e) {
    console.error("[api/invitations][POST] error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
