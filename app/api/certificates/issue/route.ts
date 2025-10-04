// app/api/certificates/issue/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/db";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { generateCertificate } from "@/lib/certificates";

const SMTP = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || "465"),
  user: process.env.SMTP_USER || "",
  pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  from: process.env.EMAIL_FROM || process.env.SMTP_USER || "",
};
const SMTP_SECURE = SMTP.port === 465;

function safeName(s?: string | null) {
  if (!s) return "";
  return s.replace(/[^\p{L}\p{N}\s\-_()]/gu, "");
}

/** POST /api/certificates/issue
 * body: { levelKey: string, chapterId: string, chapterTitle: string }
 * Auth par JWT (getToken). Résolution de l'utilisateur par email (upsert)
 * pour éviter les erreurs de FK après un reset DB.
 */
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

  // 🔎 Résolution/creation utilisateur par email (source stable)
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: userName || null,
      role: "Employé", // défaut ; ajustable si besoin
      storeCode: storeCode || null,
      storeName: storeName || null,
    },
  });
  const userId = user.id;

  // 🎯 Payload
  const { levelKey, chapterId, chapterTitle } = await req.json().catch(() => ({} as any));
  if (!levelKey || !chapterId || !chapterTitle) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  try {
    // 🔁 Idempotence (sans dépendre d'un composite unique côté client)
    const existing = await prisma.certificate.findFirst({
      where: { userId, levelKey, chapterId },
    });
    if (existing) {
      return NextResponse.json({ ok: true, certificate: existing, already: true });
    }

    // 📄 Données PDF
    const issuedDate = new Date().toISOString().slice(0, 10);
    const store = storeName ? `${storeName}${storeCode ? ` — (${storeCode})` : ""}` : "";
    const certId = `CSS:${(levelKey.match(/\d+/)?.[0] || "N")}-C${chapterId}-${issuedDate.replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // 🖨️ Génération PDF
    const pdfBytes = await generateCertificate({
      name: safeName(userName) || userEmail,
      levelKey,
      chapterId,
      chapterTitle,
      store,
      issuedDate,
      certificateId: certId, signerName: "Paul Wehbe",
      signerTitle: "Propriétaire franchisé",
    });

    // 💾 Écriture fichier /public/certs/{userId}/...
    const baseDir = path.join(process.cwd(), "public", "certs", userId);
    fs.mkdirSync(baseDir, { recursive: true });

    const fileNameSafe = `Certificat_${levelKey.replace(/\s+/g, "_")}_Chapitre_${chapterId}_${safeName(userName) || userEmail}_${issuedDate}.pdf`;
    const filePath = path.join(baseDir, fileNameSafe);
    fs.writeFileSync(filePath, Buffer.from(pdfBytes));
    const webPath = `/certs/${encodeURIComponent(userId)}/${encodeURIComponent(fileNameSafe)}`;

    // 🗃️ Enregistrement en DB
    let row;
    try {
      row = await prisma.certificate.create({
        data: {
          userId,
          levelKey,
          chapterId,
          chapterTitle,
          filePath: webPath,
          issuedAt: new Date(),
        },
      });
    } catch (e) {
      console.error("[certificates/issue] prisma create error:", e);
      throw e;
    }

    // ✉️ Email (best-effort)
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
      // on n'échoue pas l'API si l'email rate
    }

    return NextResponse.json({ ok: true, certificate: row });
  } catch (e) {
    console.error("[certificates/issue] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
