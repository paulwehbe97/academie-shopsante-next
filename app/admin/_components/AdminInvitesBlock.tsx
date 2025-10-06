// app/admin/_components/AdminInvitesBlock.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Invite = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  storeCode: string;
  storeName?: string;
  hireDate?: string | null;
  invitedAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  status: "pending" | "revoked" | "accepted";
  expired: boolean;
};

type Store = {
  code: string;
  name: string;
};

export default function AdminInvitesBlock() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [filterStore, setFilterStore] = useState<string>("");

  // Formulaire
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Employé",
    storeCode: "",
    hireDate: "",
  });
  const [sending, setSending] = useState(false);

  async function loadInvites() {
    const res = await fetch("/api/invites/list");
    const data = await res.json();
    if (data.ok) setInvites(data.invites);
  }

  async function loadStores() {
    const res = await fetch("/api/admin/stores/list");
    const data = await res.json();
    if (data.ok) setStores(data.stores);
  }

  useEffect(() => {
    loadInvites();
    loadStores();
  }, []);

  async function handleSend() {
    console.log("handleSend triggered", form);
    if (!form.email || !form.firstName || !form.lastName || !form.storeCode) {
      toast.error("Tous les champs sont requis");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          storeCode: form.storeCode,
          storeName: stores.find((s) => s.code === form.storeCode)?.name || "",
          hireDate: form.hireDate || null,
        }),
      });
      console.log("Réponse brute:", res.status, res.statusText);

      const text = await res.text();
      console.log("Réponse texte brute:", text);

      let json: any = null;
      try {
        json = JSON.parse(text);
        console.log("Réponse JSON:", json);
      } catch {
        console.log("Réponse non JSON (probablement erreur serveur)");
      }

      if (res.ok) {
        toast.success("Invitation envoyée !");
        setForm({ firstName: "", lastName: "", email: "", role: "Employé", storeCode: "", hireDate: "" });
        loadInvites();
      } else {
        toast.error("Erreur lors de l’envoi");
      }
    } catch (e) {
      console.error("Erreur réseau ou fetch:", e);
      toast.error("Erreur réseau");
    }
    setSending(false);
  }

  async function handleResend(invite: Invite) {
    const res = await fetch("/api/invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        role: invite.role,
        storeCode: invite.storeCode,
        storeName: invite.storeName,
        hireDate: invite.hireDate,
        inviteId: invite.id,
      }),
    });

    if (res.ok) {
      toast.success("Invitation renvoyée !");
      loadInvites();
    } else {
      toast.error("Erreur lors du renvoi");
    }
  }

  async function handleRevoke(invite: Invite) {
    const res = await fetch("/api/invites/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jti: invite.id }),
    });

    if (res.ok) {
      toast.success("Invitation révoquée !");
      loadInvites();
    } else {
      toast.error("Erreur lors de la révocation");
    }
  }

  function badge(invite: Invite) {
    if (invite.status === "accepted") {
      return <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">Succès</span>;
    }
    if (invite.status === "revoked") {
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">Révoquée</span>;
    }
    if (invite.status === "pending" && invite.expired) {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Expirée</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">En attente</span>;
  }

  const filteredInvites = filterStore
    ? invites.filter((i) => i.storeCode === filterStore)
    : invites;

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <h2 className="text-lg font-bold mb-4">Inviter un nouvel utilisateur</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <input
          placeholder="Prénom"
          className="border rounded-lg px-3 py-2"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <input
          placeholder="Nom"
          className="border rounded-lg px-3 py-2"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
        <input
          placeholder="Email"
          className="border rounded-lg px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="Employé">Employé</option>
          <option value="Gérant">Gérant</option>
          <option value="Admin">Admin</option>
        </select>
        <select
          className="border rounded-lg px-3 py-2"
          value={form.storeCode}
          onChange={(e) => setForm({ ...form, storeCode: e.target.value })}
        >
          <option value="">Choisir une boutique</option>
          {stores.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border rounded-lg px-3 py-2"
          value={form.hireDate}
          onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        className="px-4 py-2 rounded-lg text-white disabled:opacity-50
                   bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal
                   hover:opacity-90 transition"
      >
        {sending ? "Envoi..." : "Envoyer l’invitation"}
      </button>

      <div>
        <label className="block mb-2 text-sm font-medium">
          Invitations en attentes — Filtre par boutique
        </label>
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Toutes les boutiques</option>
          {stores.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {filteredInvites.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune invitation.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border">Prénom</th>
                <th className="px-3 py-2 border">Nom</th>
                <th className="px-3 py-2 border">Email</th>
                <th className="px-3 py-2 border">Rôle</th>
                <th className="px-3 py-2 border">Succursale</th>
                <th className="px-3 py-2 border">Date embauche</th>
                <th className="px-3 py-2 border">Envoyée le</th>
                <th className="px-3 py-2 border">Statut</th>
                <th className="px-3 py-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map((inv) => (
                <tr key={inv.id} className="text-center">
                  <td className="px-3 py-2 border">{inv.firstName}</td>
                  <td className="px-3 py-2 border">{inv.lastName}</td>
                  <td className="px-3 py-2 border">{inv.email}</td>
                  <td className="px-3 py-2 border">{inv.role}</td>
                  <td className="px-3 py-2 border">{inv.storeName || inv.storeCode}</td>
                  <td className="px-3 py-2 border">{inv.hireDate || "-"}</td>
                  <td className="px-3 py-2 border">
                    {new Date(inv.invitedAt).toLocaleDateString("fr-CA")}
                  </td>
                  <td className="px-3 py-2 border">{badge(inv)}</td>
                  <td className="px-3 py-2 border">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleResend(inv)}
                        disabled={inv.status === "accepted"}
                        className="px-2 py-1 rounded-lg bg-yellow-500 text-white text-xs disabled:opacity-50"
                      >
                        Renvoyer
                      </button>
                      <button
                        onClick={() => handleRevoke(inv)}
                        disabled={inv.status !== "pending"}
                        className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs disabled:opacity-50"
                      >
                        Révoquer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
