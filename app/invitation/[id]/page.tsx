'use client';

import { useEffect, useMemo, useState } from "react";
import { KEYS, loadJSON, saveJSON } from "../../../lib/storage";

type Invite = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "Employé";
  storeCode: string;
  storeName: string;
  hireDate: string;   // YYYY-MM-DD
  status: "pending" | "revoked" | "accepted";
  invitedAt: string;  // ISO
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "Employé" | "Gérant" | "Admin";
  storeCode: string;
  storeName: string;
  hireDate: string;
  createdAt: string;  // ISO
  active: boolean;
};

export default function InvitationPage({ params }: { params: { id: string } }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [done, setDone] = useState<"idle" | "ok" | "invalid" | "expired" | "revoked">("idle");

  useEffect(() => {
    setInvites((loadJSON<Invite[]>(KEYS.invites, []) ?? []) as Invite[]);
    setUsers((loadJSON<User[]>(KEYS.users, []) ?? []) as User[]);
  }, []);

  const invite = useMemo(
    () => invites.find((i) => i.id === params.id),
    [invites, params.id]
  );

  useEffect(() => {
    if (!invite) return;
    if (invite.status === "revoked") { setDone("revoked"); return; }
    if (invite.status === "accepted") { setDone("ok"); return; }

    // validité 72h
    const created = new Date(invite.invitedAt).getTime();
    const expires = created + 72 * 60 * 60 * 1000;
    if (Date.now() > expires) { setDone("expired"); return; }

    setDone("idle");
  }, [invite]);

  function accept() {
    if (!invite) return;

    // Créer l'utilisateur (démo : id lisible)
    const id = cryptoRandomId();
    const user: User = {
      id,
      firstName: invite.firstName,
      lastName: invite.lastName,
      email: invite.email,
      role: "Employé",
      storeCode: invite.storeCode,
      storeName: invite.storeName,
      hireDate: invite.hireDate,
      createdAt: new Date().toISOString(),
      active: true,
    };
    const nextUsers: User[] = [user, ...users];
    setUsers(nextUsers);
    saveJSON(KEYS.users, nextUsers);

    // Marquer l’invitation comme acceptée (⚠️ typer explicitement)
    const nextInvites: Invite[] = invites.map((i) =>
      i.id === invite.id ? { ...i, status: "accepted" as const } : i
    );
    setInvites(nextInvites);
    saveJSON(KEYS.invites, nextInvites);

    setDone("ok");
  }

  if (!invite) {
    return pageShell(
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Invitation introuvable</h1>
        <p className="text-gray-600">Le lien n’est pas valide.</p>
      </div>
    );
  }

  if (done === "revoked") {
    return pageShell(
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Invitation annulée</h1>
        <p className="text-gray-600">Contacte ton gérant pour en obtenir une nouvelle.</p>
      </div>
    );
  }

  if (done === "expired") {
    return pageShell(
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Invitation expirée</h1>
        <p className="text-gray-600">Les invitations expirent après 72 h. Demande un nouvel envoi.</p>
      </div>
    );
  }

  if (done === "ok") {
    return pageShell(
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Bienvenue {invite.firstName} !</h1>
        <p className="text-gray-600">
          Ton compte a été créé pour la boutique <b>{invite.storeName}</b>.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white"
        >
          Aller à l’accueil
        </a>
      </div>
    );
  }

  // Écran d’acceptation
  return pageShell(
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Invitation — {invite.storeName}</h1>
      <p className="text-gray-600 mb-4">
        {invite.firstName} {invite.lastName} &lt;{invite.email}&gt;<br />
        Rôle : Employé — Date d’embauche : {invite.hireDate}
      </p>
      <button
        onClick={accept}
        className="px-4 py-2 rounded-xl bg-brand-600 text-white"
      >
        Accepter l’invitation
      </button>
      <p className="text-xs text-gray-500 mt-3">
        Démo : aucune collecte de mot de passe, données stockées localement.
      </p>
    </div>
  );

  function pageShell(children: React.ReactNode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-100 p-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  function cryptoRandomId() {
    const n = crypto.getRandomValues(new Uint32Array(2));
    return (n[0].toString(36) + n[1].toString(36)).slice(0, 10);
  }
}
