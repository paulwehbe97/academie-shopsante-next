// app/api/policy-files/[file]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// GET /api/policy-files/:file?download=1
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

    const buffer = Buffer.from(await data.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fname}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("GET /api/policy-files error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
