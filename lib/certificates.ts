// lib/certificates.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

/**
 * Certificat – rendu de marque:
 * - Dégradé horizontal (yellow → lime → teal), sans image
 * - Cartouche blanc (contenu lisible)
 * - Logo DANS le cartouche, à gauche du titre
 * - Espacements augmentés
 * - Date/ID/Boutique DANS le cartouche (bas)
 * - "Signature" centré sous la ligne
 * - Police: Aller (TTF) si dispo, sinon Helvetica
 *
 * ➜ Place (si possible) dans /public/fonts :
 *    - Aller-Regular.ttf
 *    - Aller-Bold.ttf
 *    (les .woff2 ne sont pas pris en charge par pdf-lib)
 */

type RGB = { r: number; g: number; b: number };
const BRAND_YELLOW: RGB = { r: 0.98, g: 0.91, b: 0.24 };
const BRAND_LIME:   RGB = { r: 0.63, g: 0.86, b: 0.35 };
const BRAND_TEAL:   RGB = { r: 0.10, g: 0.73, b: 0.67 };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpRGB(c1: RGB, c2: RGB, t: number) {
  return rgb(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
}

// Dégradé horizontal en 2 segments (yellow→lime puis lime→teal)
function paintBrandGradient(page: any, width: number, height: number, stepsPerSegment = 96) {
  const h = height, segW = width / 2;
  for (let i = 0; i < stepsPerSegment; i++) {
    const t = i / (stepsPerSegment - 1);
    const color = lerpRGB(BRAND_YELLOW, BRAND_LIME, t);
    const x = (i / stepsPerSegment) * segW;
    const w = Math.ceil(segW / stepsPerSegment) + 1;
    page.drawRectangle({ x, y: 0, width: w, height: h, color });
  }
  for (let i = 0; i < stepsPerSegment; i++) {
    const t = i / (stepsPerSegment - 1);
    const color = lerpRGB(BRAND_LIME, BRAND_TEAL, t);
    const x = segW + (i / stepsPerSegment) * segW;
    const w = Math.ceil(segW / stepsPerSegment) + 1;
    page.drawRectangle({ x, y: 0, width: w, height: h, color });
  }
}

function readIfExists(rel: string): Uint8Array | null {
  try { return fs.readFileSync(path.join(process.cwd(), "public", rel.replace(/^\/+/, ""))); }
  catch { return null; }
}

// Logo: essaie PNG puis JPG, sur deux noms possibles
function readLogo(): { data: Uint8Array; kind: "png" | "jpg" } | null {
  const candidates = [
    { p: "/shopsante-logo.png", k: "png" as const },
    { p: "/logo-shopsante.png", k: "png" as const },
    { p: "/shopsante-logo.jpg", k: "jpg" as const },
    { p: "/logo-shopsante.jpg", k: "jpg" as const },
  ];
  for (const c of candidates) {
    const d = readIfExists(c.p);
    if (d) return { data: d, kind: c.k };
  }
  return null;
}

// Polices: tenter Aller (TTF), sinon Helvetica
async function embedFonts(pdf: PDFDocument) {
  const allerReg = readIfExists("/fonts/Aller-Regular.ttf");
  const allerBold = readIfExists("/fonts/Aller-Bold.ttf");

  const fontTitle = allerBold
    ? await pdf.embedFont(allerBold, { subset: true })
    : await pdf.embedFont(StandardFonts.HelveticaBold);

  const fontText = allerReg
    ? await pdf.embedFont(allerReg, { subset: true })
    : await pdf.embedFont(StandardFonts.Helvetica);

  return { fontTitle, fontText };
}

export async function generateCertificate(params: {
  name: string;
  levelKey: string;       // ex: "Niveau 1"
  chapterId: string;      // "1".."8"
  chapterTitle: string;   // ex: "Santé générale"
  store?: string;         // "Nom — (Code)" optionnel
  issuedDate?: string;    // "YYYY-MM-DD"
  certificateId?: string; // ex: "CSS:N1-C1-20250101-1234"
  signerName?: string;    // ex: "Paul Wehbe"
  signerTitle?: string;   // ex: "Propriétaire franchisé"
}) {
  const {
    name,
    levelKey,
    chapterId,
    chapterTitle,
    store = "",
    issuedDate = new Date().toISOString().slice(0, 10),
    certificateId = "",
    signerName = "Académie Shop Santé",
    signerTitle = "",
  } = params;

  // A4 paysage
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();

  // Fond marque
  paintBrandGradient(page, width, height, 96);

  // Cartouche blanc (contenu)
  const CART_X = 60;
  const CART_Y = 95;                 // un peu plus bas pour aération
  const CART_W = width - 120;
  const CART_H = height - 190;       // plus haut → plus d'espace intérieur
  page.drawRectangle({
    x: CART_X, y: CART_Y, width: CART_W, height: CART_H,
    color: rgb(1, 1, 1), opacity: 0.96,
  });

  // Polices
  const { fontTitle, fontText } = await embedFonts(pdf);

  const colDark  = rgb(0.08, 0.09, 0.10);
  const colMuted = rgb(0.30, 0.32, 0.34);
  const colGreen = rgb(0.12, 0.55, 0.42);

  // Logo dans le cartouche, à gauche du titre
  const logoCand = readLogo();
  let titleLeftMargin = CART_X + 24;
  if (logoCand) {
    try {
      const logo = logoCand.kind === "png" ? await pdf.embedPng(logoCand.data) : await pdf.embedJpg(logoCand.data);
      const LOGO_H = 48; // légèrement plus grand
      const scale = LOGO_H / logo.height;
      const w = logo.width * scale;
      const LOGO_X = CART_X + 24;
      const LOGO_Y = CART_Y + CART_H - LOGO_H - 24;
      page.drawImage(logo, { x: LOGO_X, y: LOGO_Y, width: w, height: LOGO_H });
      titleLeftMargin = LOGO_X + w + 20; // décale le titre si besoin
    } catch {
      /* ignore images invalides */
    }
  }

  // Utilitaires
  const centerInCart = (txt: string, y: number, size: number, bold = false, color = colDark) => {
    const f = bold ? fontTitle : fontText;
    const tw = f.widthOfTextAtSize(txt, size);
    page.drawText(txt, { x: CART_X + (CART_W - tw) / 2, y, size, font: f, color });
  };
  const drawAt = (txt: string, x: number, y: number, size: number, bold = false, color = colDark) => {
    const f = bold ? fontTitle : fontText;
    page.drawText(txt, { x, y, size, font: f, color });
  };

  // Titre (centré dans le cartouche) — position abaissée pour aération
  const TITLE = "CERTIFICAT DE RÉUSSITE";
  const TITLE_SIZE = 32;
  const titleWidth = fontTitle.widthOfTextAtSize(TITLE, TITLE_SIZE);
  const TITLE_Y = CART_Y + CART_H - 56; // top intérieur - marge
  page.drawText(TITLE, {
    x: CART_X + (CART_W - titleWidth) / 2,
    y: TITLE_Y,
    size: TITLE_SIZE,
    font: fontTitle,
    color: colDark,
  });

  // Texte — espacement augmenté (~15–18 pts entre lignes)
  let y = TITLE_Y - 36; // 1ère ligne sous le titre
  centerInCart("Ce document atteste que", y, 13, false, colMuted); y -= 22;
  centerInCart(name,                             y, 24, true,  colDark); y -= 26;
  centerInCart("a complété avec succès le chapitre", y, 13, false, colMuted); y -= 22;
  centerInCart(`${chapterId} — ${chapterTitle}`,     y, 20, true,  colDark); y -= 24;
  centerInCart(`${levelKey} — Académie Shop Santé`,  y, 13, false, colDark); y -= 26;
  centerInCart("Mention : RÉUSSI",                   y, 17, true,  colGreen);

  // Bas du cartouche : Date / ID / Boutique (centrés)
  const footerY1 = CART_Y + 36;
  const footerY2 = CART_Y + 18;
  const metaLine = `Date : ${issuedDate}${certificateId ? `    ID certificat : ${certificateId}` : ""}`;
  centerInCart(metaLine, footerY1, 11, false, colMuted);
  if (store) centerInCart(`Boutique : ${store}`, footerY2, 11, false, colMuted);

  // Signature (ligne + libellé centré) — toujours DANS le cartouche (droite)
  const SIGN_LINE_W = 230;
  const signLineY = CART_Y + 64;
  const signLineX = CART_X + CART_W - SIGN_LINE_W - 32;
  // ligne
  page.drawLine({
    start: { x: signLineX, y: signLineY },
    end:   { x: signLineX + SIGN_LINE_W, y: signLineY },
    thickness: 1,
    color: colMuted,
  });
  // nom + titre (au-dessus de la ligne)
  const signLabel = signerTitle ? `${signerName} - ${signerTitle}` : signerName;
  drawAt(signLabel, signLineX, signLineY + 12, 11, false, colDark);

  // "Signature" centré SOUS la ligne
  const sigText = "Signature";
  const sigSize = 10;
  const sigW = fontText.widthOfTextAtSize(sigText, sigSize);
  const sigX = signLineX + (SIGN_LINE_W - sigW) / 2;
  drawAt(sigText, sigX, signLineY - 12, sigSize, false, colMuted);

  return await pdf.save();
}
