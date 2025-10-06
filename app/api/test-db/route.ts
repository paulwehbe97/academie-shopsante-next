import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const count = await prisma.user.count();
    return Response.json({ ok: true, count });
  } catch (err) {
    console.error("DB test failed:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
