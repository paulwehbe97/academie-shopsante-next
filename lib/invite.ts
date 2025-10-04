// lib/invite.ts
import jwt from "jsonwebtoken";
import prisma from "@/lib/db"; // doit exposer un PrismaClient singleton (cf. mémo)
const INVITE_SECRET = process.env.INVITE_SECRET || "dev-invite-secret";

// Types
export type InviteRole = "Employé" | "Gérant" | "Admin";
export type InvitePayload = {
  purpose: "signup";
  email: string;
  role?: InviteRole;
  storeCode?: string | null;
  storeName?: string | null;
  jti: string;          // identifiant unique d’invitation
  iat: number;          // issued-at (sec)
  exp: number;          // expiry (sec)
};

// Génère un token d’invitation (JWT signé)
export async function signInvite(opts: {
  email: string;
  role?: InviteRole;
  storeCode?: string | null;
  storeName?: string | null;
  ttlHours?: number;          // défaut 24h
  jti?: string;               // si non fourni => généré
}): Promise<string> {
  const {
    email,
    role = "Employé",
    storeCode = null,
    storeName = null,
    ttlHours = 24,
  } = opts;

  const jti =
    opts.jti ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "inv_" + Math.random().toString(36).slice(2, 10));

  const token = jwt.sign(
    { purpose: "signup", email, role, storeCode, storeName, jti },
    INVITE_SECRET,
    { expiresIn: `${ttlHours}h` }
  );

  return token;
}

/** Valide un jeton d’invitation et renvoie le payload (ou null si invalide/expiré) */
export function verifyInvite(token: string): InvitePayload | null {
  try {
    const decoded = jwt.verify(token, INVITE_SECRET) as any;
    if (decoded?.purpose !== "signup") throw new Error("bad-purpose");
    // Typage sécurisé du retour
    return {
      purpose: "signup",
      email: String(decoded.email),
      role: decoded.role as InviteRole | undefined,
      storeCode: (decoded.storeCode ?? null) as string | null,
      storeName: (decoded.storeName ?? null) as string | null,
      jti: String(decoded.jti),
      iat: Number(decoded.iat),
      exp: Number(decoded.exp),
    };
  } catch {
    return null;
  }
}

/** Récupère le jti sans vérif cryptographique (lecture base64) – utile pour logs/UI */
export function peekInviteId(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return typeof payload?.jti === "string" ? payload.jti : null;
  } catch {
    return null;
  }
}

/** Marque une invitation comme consommée (blacklist jti) */
export async function consumeInvite(jti: string): Promise<boolean> {
  if (!jti) return false;
  try {
    await prisma.revokedInvite.upsert({
      where: { id: jti },
      update: {},          // déjà révoqué -> on ne fait rien
      create: { id: jti }, // première révocation -> on insère
    });
    return true;
  } catch (e) {
    console.error("consumeInvite error", e);
    return false;
  }
}

/** Vérifie si une invitation a été révoquée/consommée */
export async function isInviteRevoked(jti: string): Promise<boolean> {
  try {
    const found = await prisma.revokedInvite.findUnique({ where: { id: jti } });
    return !!found;
  } catch {
    return false; // en dev si table absente
  }
}
