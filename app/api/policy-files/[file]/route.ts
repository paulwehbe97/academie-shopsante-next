// app/api/policy-files/[file]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { file: string } }) {
  try {
    const fname = decodeURIComponent(params.file);
    const fileKey = `policies/${fname}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.storage.from("policies").download(fileKey);
    if (error || !data) throw error;

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // On impose un vrai nom PDF
    const safeName =
      fname.toLowerCase().endsWith(".pdf") ? fname : `${fname || "document"}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // ✅ nom figé, aucune ambiguïté
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("GET /api/policy-files error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
