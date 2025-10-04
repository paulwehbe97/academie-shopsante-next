// app/api/invites/dev-generate/route.ts
import { NextResponse } from "next/server";
import { signInvite, peekInviteId } from "@/lib/invite";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").toLowerCase().trim();
  const role = (url.searchParams.get("role") || "Employé") as any;

  // ⚠️ Champs requis côté Prisma → valeurs par défaut vides
  const storeCodeParam = url.searchParams.get("storeCode");
  const storeNameParam = url.searchParams.get("storeName");
  const storeCodeForLog = storeCodeParam ?? ""; // <-- évite l'erreur "must not be null" / "is missing"
  const storeNameForLog = storeNameParam ?? "";

  if (!email) {
    return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
  }

  // Le token n'a pas besoin d'inclure storeCode/Name si tu ne les utilises pas
  const token = await signInvite({
    email,
    role,
    storeCode: storeCodeParam ?? undefined,
    storeName: storeNameParam ?? undefined,
    ttlHours: 24,
  });
  const jti = peekInviteId(token);

  if (jti) {
    try {
      await prisma.inviteLog.create({
        data: {
          jti,
          email,
          role,
          invitedAt: new Date(),
          // ✅ toujours fournis (même si vides) pour respecter NOT NULL
          storeCode: storeCodeForLog,
          storeName: storeNameForLog,
        } as any,
      });
    } catch (e) {
      // On ne bloque pas la génération du lien en dev
      console.warn("[dev-generate] inviteLog.create skipped:", (e as any)?.message || e);
    }
  }

  const base = process.env.NEXTAUTH_URL || "http://localhost:3002";
  const link = `${base}/signup?token=${encodeURIComponent(token)}`;
  return NextResponse.json({ ok: true, token, link, jti });
}
