import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET : retourne tous les partenaires
export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(partners);
  } catch (error) {
    console.error("Erreur lors du chargement des partenaires :", error);
    return NextResponse.json(
      { error: "Impossible de charger les partenaires" },
      { status: 500 }
    );
  }
}

// POST : ajoute un nouveau partenaire
export async function POST(req: Request) {
  try {
    const data = await req.json();
    let { name, description, logoUrl, link } = data;

    if (!name || !description) {
      return NextResponse.json({ error: "Nom et description sont requis" }, { status: 400 });
    }

    // 🧠 Si aucun logoUrl fourni, on essaie d’en générer un à partir du lien
    if ((!logoUrl || logoUrl.trim() === "") && link && link.trim() !== "") {
      try {
        const domain = new URL(link).hostname.replace("www.", "");
        logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
      } catch {
        logoUrl = ""; // lien invalide → on laisse vide
      }
    }

    const partner = await prisma.partner.create({
      data: {
        name,
        description,
        logoUrl: logoUrl || "",
        link: link || "",
      },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("Erreur POST /partners :", error);
    return NextResponse.json({ error: "Création échouée" }, { status: 500 });
  }
}
