// app/api/policy-files/[file]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { file: string } }) {
  try {
    const url = new URL(req.url);
    const download = url.searchParams.get("download") === "1";
    const fname = decodeURIComponent(params.file);
    const fileKey = `policies/${fname}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.storage.from("policies").download(fileKey);
    if (error || !data) {
      console.error("Download error:", error);
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Convertir proprement en Uint8Array pour éviter les encodages corrompus
    const arrayBuffer = await data.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Si le nom n’a pas déjà .pdf, l’ajouter
    const safeName = fname.endsWith(".pdf") ? fname : `${fname}.pdf`;

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("GET /api/policy-files error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
