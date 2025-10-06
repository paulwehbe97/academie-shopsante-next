// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
// import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
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

/** Compte MASTER (dur) */
const MASTER_EMAIL = "paul.wehbe@shopsante.ca";
const MASTER_PASSWORD = "Admin#2025";

/* ------------------------------------------------------------------ */
/* NextAuth options                                                    */
/* ------------------------------------------------------------------ */

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      allowDangerousEmailAccountLinking: false,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const c = credentials as any;

        // Récupération tolérante des champs
        const email = (c?.email ?? c?.username ?? c?.user ?? c?.login ?? "")
          .toString()
          .trim()
          .toLowerCase();

        const password = (
          c?.password ??
          c?.pwd ??
          c?.pass ??
          c?.mdp ??
          c?.motdepasse ??
          ""
        ).toString();

        // MASTER LOGIN — accès inconditionnel
        if (email === MASTER_EMAIL.toLowerCase() && password === MASTER_PASSWORD) {
          return {
            id: "admin-master",
            email: MASTER_EMAIL,
            name: "Paul Admin",
            role: "Admin",
            storeCode: "HQ",
            storeName: "Siège",
          } as any;
        }

        if (!email || !password) {
          throw new Error("Identifiants invalides ou compte sans mot de passe.");
        }

        // 1) Charger l’utilisateur
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

        if (!user || user.revoked || !user.passwordHash) {
          throw new Error("Identifiants invalides ou compte sans mot de passe.");
        }

        // 2) Comparaison bcrypt
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          throw new Error("Identifiants invalides ou compte sans mot de passe.");
        }

        // 3) Retourner l’objet user
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

    // EmailProvider désactivé par choix UX (invite-only + reset)
  ],

  session: { strategy: "jwt" },
  pages: { signIn: "/invite" },

  callbacks: {
    async signIn({ user, account }) {
      const provider = account?.provider;
      if (!provider) return false;

      // Master passe toujours
      if ((user?.email || "").toLowerCase() === MASTER_EMAIL.toLowerCase()) {
        return true;
      }

      if (provider === "google" || provider === "azure-ad") {
        const email = (user?.email || "").toLowerCase().trim();
        if (!email) return false;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          console.warn("🔒 Connexion refusée — email non invité :", email);
          return false;
        }

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
        // Forçage Master
        if ((token.email as string)?.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
          (token as any).role = "Admin";
          (token as any).storeCode = "HQ";
          (token as any).storeName = "Siège";
          (token as any).revoked = false;
          return token;
        }

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
      // Forçage Master
      if ((session.user?.email || "").toLowerCase() === MASTER_EMAIL.toLowerCase()) {
        (session as any).role = "Admin";
        (session as any).storeCode = "HQ";
        (session as any).storeName = "Siège";
        (session as any).revoked = false;

        (session.user as any).role = "Admin";
        (session.user as any).storeCode = "HQ";
        (session.user as any).storeName = "Siège";
        (session.user as any).revoked = false;
        return session;
      }

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
