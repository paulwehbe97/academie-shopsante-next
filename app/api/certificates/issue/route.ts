import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/db";
import nodemailer from "nodemailer";
import { generateCertificate } from "@/lib/certificates";
import { createClient } from "@supabase/supabase-js";

/* -------------------------------------------------------------------------- */
/*  🔧 Config SMTP                                                            */
/* -------------------------------------------------------------------------- */
const SMTP = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || "465"),
  user: process.env.SMTP_USER || "",
  pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  from: process.env.EMAIL_FROM || process.env.SMTP_USER || "",
};
const SMTP_SECURE = SMTP.port === 465;

/* -------------------------------------------------------------------------- */
/*  🧼 safeName — génère un nom de fichier “URL-safe” pour Supabase           */
/* -------------------------------------------------------------------------- */
function safeName(s?: string | null) {
  if (!s) return "";
  return s
    .normalize("NFD")                      // décompose les accents
    .replace(/[\u0300-\u036f]/g, "")       // supprime les diacritiques
    .replace(/[^\w\-().]+/g, "_")          // remplace espaces et caractères spéciaux
    .replace(/_+/g, "_")                   // compact les underscores
    .replace(/^_+|_+$/g, "");              // nettoie en début/fin
}

/* -------------------------------------------------------------------------- */
/*  📩 Route POST /api/certificates/issue                                     */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  // 🔐 Auth via JWT
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = String(token.email);
  const userName = typeof token.name === "string" ? token.name : "";
  const storeCode = (token as any)?.storeCode as string | null;
  const storeName = (token as any)?.storeName as string | null;

  // 🔎 Vérifie ou crée l’utilisateur
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: userName || null,
      role: "Employé",
      storeCode: storeCode || null,
      storeName: storeName || null,
    },
  });
  const userId = user.id;

  // 🎯 Paramètres
  const { levelKey, chapterId, chapterTitle } = await req.json().catch(() => ({} as any));
  if (!levelKey || !chapterId || !chapterTitle) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  try {
    // 🔁 Idempotence
    const existing = await prisma.certificate.findFirst({
      where: { userId, levelKey, chapterId },
    });
    if (existing) {
      return NextResponse.json({ ok: true, certificate: existing, already: true });
    }

    // 📄 Données du certificat
    const issuedDate = new Date().toISOString().slice(0, 10);
    const store = storeName ? `${storeName}${storeCode ? ` — (${storeCode})` : ""}` : "";
    const certId = `CSS:${(levelKey.match(/\d+/)?.[0] || "N")}-C${chapterId}-${issuedDate.replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // 🖨️ Génération du PDF
    const pdfBytes = await generateCertificate({
      name: userName || userEmail, // affichage inchangé dans le PDF
      levelKey,
      chapterId,
      chapterTitle,
      store,
      issuedDate,
      certificateId: certId,
      signerName: "Paul Wehbe",
      signerTitle: "Propriétaire franchisé",
    });

    // ☁️ Upload vers Supabase Storage
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileNameSafe = `Certificat_${safeName(levelKey)}_Chapitre_${safeName(chapterId)}_${safeName(userName) || userEmail}_${issuedDate}.pdf`;
    const storagePath = `${safeName(userId)}/${fileNameSafe}`;

    const { error: uploadError } = await supabase.storage
      .from("certs")
      .upload(storagePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[certificates/issue] upload error:", uploadError);
      throw new Error("Supabase upload failed");
    }

    const { data: publicUrlData } = supabase.storage.from("certs").getPublicUrl(storagePath);
    const webPath = publicUrlData.publicUrl || "";

    // 🗃️ Enregistrement en DB
    const row = await prisma.certificate.create({
      data: {
        userId,
        levelKey,
        chapterId,
        chapterTitle,
        filePath: webPath,
        issuedAt: new Date(),
      },
    });

    // ✉️ Envoi du courriel (best effort)
    try {
      const transport = nodemailer.createTransport({
        host: SMTP.host,
        port: SMTP.port,
        secure: SMTP_SECURE,
        auth: SMTP.user && SMTP.pass ? { user: SMTP.user, pass: SMTP.pass } : undefined,
      });
      await transport.verify();
      await transport.sendMail({
        to: userEmail,
        from: SMTP.from,
        subject: `Certificat — ${levelKey} / Chapitre ${chapterId} — Académie Shop Santé`,
        text: `Bonjour,

Veuillez trouver ci-joint votre certificat de réussite pour le chapitre "${chapterTitle}" (${levelKey}).

— Académie Shop Santé`,
        html: `
          <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
            <p>Bonjour,</p>
            <p>Veuillez trouver en pièce jointe votre <b>certificat de réussite</b> pour le chapitre <b>"${chapterTitle}"</b> (${levelKey}).</p>
            <p>— Académie Shop Santé</p>
          </div>
        `,
        attachments: [{ filename: fileNameSafe, content: Buffer.from(pdfBytes) }],
      });
      await prisma.certificate.update({ where: { id: row.id }, data: { sentAt: new Date() } });
    } catch (e) {
      console.error("[certificates/issue] email send error:", e);
    }

    return NextResponse.json({ ok: true, certificate: row });
  } catch (e) {
    console.error("[certificates/issue] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
