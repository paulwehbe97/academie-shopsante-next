import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.partner.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /partners/[id] :", error);
    return NextResponse.json(
      { error: "Suppression échouée" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json();
    const { name, description, logoUrl, link } = data;

    const updated = await prisma.partner.update({
      where: { id: parseInt(params.id) },
      data: { name, description, logoUrl, link },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur PUT /partners/[id] :", error);
    return NextResponse.json({ error: "Modification échouée" }, { status: 500 });
  }
}
