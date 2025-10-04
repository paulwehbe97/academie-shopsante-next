// app/api/policy-files/[file]/route.ts
import { NextResponse } from "next/server";
import { readPolicyPdfStream } from "@/lib/policyStorage";

export const dynamic = "force-dynamic";

// GET /api/policy-files/:file?download=1
export async function GET(req: Request, { params }: { params: { file: string } }) {
  try {
    const url = new URL(req.url);
    const download = url.searchParams.get("download") === "1";
    const fname = decodeURIComponent(params.file);
    const { file, size, name } = await readPolicyPdfStream(`policies/${fname}`);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(size),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
