// lib/invites.ts
// Wrapper autour de ton fichier existant lib/invite.ts (singulier)
// Fournit les exports attendus par tes routes: signInvite + sendInviteEmail

import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import {
  signInvite as signInviteJWT,
  verifyInvite,
  peekInviteId,
} from './invite';

export type { InviteRole, InvitePayload } from './invite';

/** Construit l’URL d’inscription avec le token */
export function buildInviteUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3002';
  return `${base.replace(/\/$/, '')}/signup?token=${encodeURIComponent(token)}`;
}

/** Signe une invitation et renvoie { token, jti, expiresAt } */
export async function signInvite(input: {
  email: string;
  role?: 'Employé' | 'Gérant' | 'Admin';
  storeCode?: string | null;
  storeName?: string | null;
  ttlHours?: number;
  jti?: string;
}): Promise<{ token: string; jti: string; expiresAt: string }> {
  const token = await signInviteJWT(input);
  const payload = verifyInvite(token);
  const jti = payload?.jti || peekInviteId(token) || input.jti || randomUUID();
  const expSec = payload?.exp ?? Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  return { token, jti, expiresAt: new Date(expSec * 1000).toISOString() };
}

/** Envoie l’email d’invitation via SMTP */
export async function sendInviteMail(to: string, token: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || 'noreply@example.com';

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP env (SMTP_HOST/SMTP_USER/SMTP_PASS).');
  }

  const url = buildInviteUrl(token);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = TLS
    auth: { user, pass },
  });

  const html = `
    <p>Bonjour,</p>
    <p>Vous avez été invité à rejoindre l’Académie Shop Santé.</p>
    <p><a href="${url}">Cliquez ici pour vous inscrire</a> (lien valide 24h).</p>
    <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${url}</p>
  `;
  const text = `Bonjour,
Vous avez été invité à rejoindre l’Académie Shop Santé.
Lien d'inscription (valide 24h): ${url}
`;

  await transporter.sendMail({
    from,
    to,
    subject: 'Votre invitation — Académie Shop Santé',
    html,
    text,
  });

  return { ok: true, url };
}

/** ⚠️ Alias pour compatibilité avec ta route: certaines importent sendInviteEmail */
export async function sendInviteEmail(to: string, token: string) {
  return sendInviteMail(to, token);
}
