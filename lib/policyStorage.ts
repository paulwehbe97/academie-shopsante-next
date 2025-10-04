// lib/policyStorage.ts
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const POLICY_DIR = path.join(ROOT, "uploads", "policies");

function sanitize(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureDir() {
  await fs.mkdir(POLICY_DIR, { recursive: true });
}

export async function savePolicyPdf(file: File, originalName?: string) {
  await ensureDir();
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  const ext = ".pdf";
  const base = sanitize((originalName || file.name || "document").replace(/\.pdf$/i, "")) || "document";
  const stamp = new Date().toISOString().replace(/[:.]/g, "");
  const fname = `${stamp}-${base}${ext}`;

  const fileKey = `policies/${fname}`;
  const abs = path.join(POLICY_DIR, fname);
  await fs.writeFile(abs, buf);

    const fileUrl = `/api/policy-files/${encodeURIComponent(fname)}`; // <-- au lieu de /api/files/policies/...
  return { fileKey, fileUrl };
}

export async function readPolicyPdfStream(fileKey: string) {
  const fname = fileKey.split("/").pop()!;
  const abs = path.join(POLICY_DIR, fname);
  const stat = await fs.stat(abs);
  const file = await fs.readFile(abs);
  return { file, size: stat.size, name: fname };
}

export async function removePolicyFile(fileKey: string) {
  const fname = fileKey.split("/").pop()!;
  const abs = path.join(POLICY_DIR, fname);
  try {
    await fs.unlink(abs);
    return true;
  } catch {
    return false;
  }
}
