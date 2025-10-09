// app/api/policies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { savePolicyPdf } from "@/lib/policyStorage";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  return session?.user?.role === "Admin" || session?.user?.role === "Gérant";
}

// GET /api/policies → liste
export async function GET() {
  try {
    // ✅ Ajout de la jointure avec _count
    const docs = await prisma.policyDoc.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { acceptances: true },
        },
      },
    });

    // ✅ Renvoi d’un champ acceptCount
    const items = docs.map((d) => ({
      ...d,
      acceptCount: d._count.acceptances,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("GET /api/policies error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

// POST /api/policies → ajout d’un document PDF
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!isAdmin(session)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();

    if (!file || !title) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const { fileKey, fileUrl } = await savePolicyPdf(file, "policies");

    const created = await prisma.policyDoc.create({
      data: {
        title,
        category,
        fileKey,
        fileUrl,
      },
    });

    return NextResponse.json({ ok: true, doc: created });
  } catch (err) {
    console.error("POST /api/policies error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
