import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { savePolicyPdf } from "@/lib/policyStorage";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  return session?.user?.role === "Admin" || session?.user?.role === "Gérant";
}

type SafeSession = {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
};

// GET /api/policies → liste des documents (admin + employé)
export async function GET() {
  try {
    const rawSession = await getServerSession(authOptions as any);
    const session = rawSession as SafeSession;
    const email = session?.user?.email || null;

    // Chercher l'utilisateur connecté pour obtenir son userId
    let userId: string | null = null;
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    // Charger les documents et leurs acceptations
    const docs = await prisma.policyDoc.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { acceptances: true } },
        acceptances: userId
          ? {
              where: { userId },
              select: { acceptedAt: true, fullName: true },
            }
          : false,
      },
    });

    // Construire la réponse simplifiée
    const items = docs.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      fileUrl: d.fileUrl,
      fileKey: d.fileKey,
      createdAt: d.createdAt,
      acceptCount: d._count.acceptances,
      acceptedAt: d.acceptances?.[0]?.acceptedAt || null,
      acceptedBy: d.acceptances?.[0]?.fullName || null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("GET /api/policies error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// POST /api/policies → ajout d’un PDF (admin)
export async function POST(req: NextRequest) {
  try {
    const rawSession = await getServerSession(authOptions as any);
    const session = rawSession as SafeSession;

    if (!isAdmin(session)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "").trim();

    if (!file || !title) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const { fileKey, fileUrl } = await savePolicyPdf(file, "policies");

    const created = await prisma.policyDoc.create({
      data: { title, category, fileKey, fileUrl },
    });

    return NextResponse.json({ ok: true, doc: created });
  } catch (err) {
    console.error("POST /api/policies error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
