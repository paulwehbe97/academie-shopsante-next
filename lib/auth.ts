// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
// Magic link désactivé pour coller à la stratégie invite-only
// import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
// Conservé pour usages email (ex.: reset password à l’étape suivante)
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./db";

/* ------------------------------------------------------------------ */
/* ENV & Constantes                                                    */
/* ------------------------------------------------------------------ */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const MANAGER_EMAILS = (process.env.MANAGER_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Domaines (conservé pour un futur usage reset si besoin) */
const ALLOWED_MAGIC_DOMAINS =
  (process.env.ALLOWED_MAGIC_DOMAINS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean).length > 0
    ? (process.env.ALLOWED_MAGIC_DOMAINS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : ["shopsante.ca", "gmail.com", "hotmail.com", "hotmail.fr"];

/** SMTP (mêmes variables que pour l’envoi de certificats / reset) */
const SMTP = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || "465"),
  user: process.env.SMTP_USER || "",
  pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  from: process.env.EMAIL_FROM || process.env.SMTP_USER || "",
};
const SMTP_SECURE = SMTP.port === 465; // 465 = SSL

/** Type utilitaire local */
type Role = "Employé" | "Gérant" | "Admin";

/* ------------------------------------------------------------------ */
/* NextAuth options                                                    */
/* ------------------------------------------------------------------ */

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 🔒 Empêche tout linking cross-email (email pivot strict)
      allowDangerousEmailAccountLinking: false,
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common", // ✅ tous comptes Microsoft (pro/perso)
      allowDangerousEmailAccountLinking: false,
    }),

    // ✨ Credentials : connexion locale par mot de passe
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").trim().toLowerCase();
        const password = credentials?.password || "";

        if (!email || !password) {
          throw new Error("Identifiants invalides ou compte sans mot de passe.");
        }

        // 1) Charger l’utilisateur avec le hash
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            storeCode: true,
            storeName: true,
            revoked: true,
            passwordHash: true,
          },
        });

        // 2) Vérifs de base
        if (!user) {
          throw new Error("Identifiants invalides ou compte sans mot de passe.");
        }
        if (user.revoked) {
          throw new Error("Accès révoqué.");
        }
        if (!user.passwordHash) {
          throw new Error("Identifiants invalides ou compte sans mot de passe.");
        }

        // 3) Comparaison bcrypt **sur passwordHash**
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          throw new Error("Identifiants invalides ou compte sans mot de passe.");
        }

        // 4) Retourner l’objet user
        return {
          id: user.id,
          email: user.email!,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email!,
          role: user.role as Role,
          storeCode: user.storeCode,
          storeName: user.storeName,
        } as any;
      },
    }),

    // ❌ EmailProvider (magic link) désactivé pour respecter l’UX choisie (invite-only + reset password)
    /*
    EmailProvider({
      from: SMTP.from,
      maxAge: 60 * 60 * 24, // 24h
      async sendVerificationRequest({ identifier, url }) {
        const transport = nodemailer.createTransport({
          host: SMTP.host,
          port: SMTP.port,
          secure: SMTP_SECURE,
          auth: SMTP.user && SMTP.pass ? { user: SMTP.user, pass: SMTP.pass } : undefined,
        });
        await transport.verify();
        const { host } = new URL(url);
        const subject = `Connexion à ${host} — lien magique`;
        const text = `Cliquez pour vous connecter : ${url}\n\nCe lien expire dans 24 heures.`;
        const html = `...`;
        await transport.sendMail({ to: identifier, from: SMTP.from, subject, text, html });
      },
    }),
    */
  ],

  session: { strategy: "jwt" },
  pages: { signIn: "/invite" },

  callbacks: {
    async signIn({ user, account }) {
      const provider = account?.provider;
      if (!provider) return false;

      if (provider === "google" || provider === "azure-ad") {
        const email = (user?.email || "").toLowerCase().trim();
        if (!email) return false;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          console.warn("🔒 Connexion refusée — email non invité :", email);
          return false;
        }

        // Lien Account (évite les doubles)
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId: account?.providerAccountId!,
            },
          },
          update: {},
          create: {
            userId: existing.id,
            provider,
            providerAccountId: account?.providerAccountId!,
            type: account?.type!,
            access_token: (account as any)?.access_token,
            token_type: (account as any)?.token_type,
            scope: (account as any)?.scope,
          },
        });

        return true;
      }

      if (provider === "credentials") return true;
      return false;
    },

    /** Enrichit le JWT avec role / storeCode / storeName / revoked */
    async jwt({ token, user }) {
      try {
        // Si on a l'user (nouvelle connexion), utiliser son id/email
        const selector =
          user?.id
            ? { id: user.id as string }
            : token?.email
            ? { email: token.email as string }
            : null;

        if (selector) {
          const db = await prisma.user.findFirst({
            where: selector as any,
            select: {
              role: true,
              storeCode: true,
              storeName: true,
              revoked: true,
              email: true,
            },
          });

          if (db) {
            (token as any).role = db.role ?? (token as any).role ?? "Employé";
            (token as any).storeCode = db.storeCode ?? null;
            (token as any).storeName = db.storeName ?? null;
            (token as any).revoked = !!db.revoked;
          }
        }
      } catch (err) {
        console.warn("JWT enrich error", err);
      }
      return token;
    },

    /** Répercute les infos JWT dans la session */
    async session({ session, token }) {
      const role = (token as any).role ?? "Employé";
      const storeCode = (token as any).storeCode ?? null;
      const storeName = (token as any).storeName ?? null;
      const revoked = (token as any).revoked ?? false;

      (session as any).role = role;
      (session as any).storeCode = storeCode;
      (session as any).storeName = storeName;
      (session as any).revoked = revoked;

      if (!session.user) session.user = {} as any;
      (session.user as any).role = role;
      (session.user as any).storeCode = storeCode;
      (session.user as any).storeName = storeName;
      (session.user as any).revoked = revoked;

      return session;
    },
  },

  logger: {
    error(code, metadata) {
      console.error("[NextAuth error]", code, metadata);
    },
    warn(code) {
      console.warn("[NextAuth warn]", code);
    },
    debug(code, metadata) {
      console.debug("[NextAuth debug]", code, metadata);
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
