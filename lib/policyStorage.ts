// lib/policyStorage.ts
import { createClient } from "@supabase/supabase-js";

function sanitize(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function savePolicyPdf(file: File, originalName?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  const ext = ".pdf";
  const base =
    sanitize((originalName || file.name || "document").replace(/\.pdf$/i, "")) || "document";
  const stamp = new Date().toISOString().replace(/[:.]/g, "");
  const fname = `${stamp}-${base}${ext}`;
  const fileKey = `policies/${fname}`;

  // Upload dans le bucket Supabase "policies"
  const { error: uploadError } = await supabase.storage
    .from("policies")
    .upload(fileKey, buf, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Générer l’URL publique
  const { data: publicUrlData } = supabase.storage.from("policies").getPublicUrl(fileKey);
  const fileUrl = publicUrlData?.publicUrl;

  return { fileKey, fileUrl };
}

// Lecture d’un PDF (optionnelle, pour la compatibilité actuelle)
export async function readPolicyPdfStream(fileKey: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.storage.from("policies").download(fileKey);
  if (error) throw error;

  const buf = Buffer.from(await data.arrayBuffer());
  return { file: buf, size: buf.length, name: fileKey.split("/").pop()! };
}

// Suppression d’un PDF (optionnelle)
export async function removePolicyFile(fileKey: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.storage.from("policies").remove([fileKey]);
  if (error) throw error;
  return true;
}
