import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      role?: "Employé" | "Gérant" | "Admin";
      storeCode?: string | null;
      storeName?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: "Employé" | "Gérant" | "Admin";
    storeCode?: string | null;
    storeName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "Employé" | "Gérant" | "Admin";
    storeCode?: string | null;
    storeName?: string | null;
  }
}
