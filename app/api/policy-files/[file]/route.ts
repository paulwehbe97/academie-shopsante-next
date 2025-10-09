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

    // Télécharger le fichier depuis Supabase Storage
    const { data, error } = await supabase.storage.from("policies").download(fileKey);
    if (error || !data) {
      console.error("Download error:", error);
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Conversion en buffer binaire
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Forcer un nom propre et extension .pdf
    const baseName = fname.toLowerCase().endsWith(".pdf") ? fname : `${fname}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        // Type MIME explicite
        "Content-Type": "application/pdf",
        // Nom forcé pour que le navigateur crée bien un .pdf
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}"; filename*=UTF-8''${encodeURIComponent(baseName)}`,
        // Autres en-têtes pour compatibilité
        "Content-Transfer-Encoding": "binary",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("GET /api/policy-files error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
