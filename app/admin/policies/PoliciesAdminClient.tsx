// app/admin/policies/PoliciesAdminClient.tsx
"use client";

import * as React from "react";

type PolicyItem = {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  fileKey: string;
  createdAt?: string;
  updatedAt?: string;
  acceptCount?: number;
};

type AcceptanceRow = {
  fullName: string;
  email: string;
  acceptedAt: string;
  ip: string;
  userAgent: string;
};

type SortMode = "date_desc" | "date_asc" | "title_asc";

export default function PoliciesAdminClient() {
  const [items, setItems] = React.useState<PolicyItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);

  const [totalEmployees, setTotalEmployees] = React.useState<number | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState("");
  const [acceptRows, setAcceptRows] = React.useState<AcceptanceRow[]>([]);
  const [acceptLoading, setAcceptLoading] = React.useState(false);
  const [csvPending, setCsvPending] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return acceptRows;
    return acceptRows.filter(
      (r) =>
        (r.fullName || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q)
    );
  }, [query, acceptRows]);

  const [listQuery, setListQuery] = React.useState("");
  const filteredItems = React.useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (d) =>
        (d.title || "").toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q)
    );
  }, [listQuery, items]);

  const [sortMode, setSortMode] = React.useState<SortMode>("date_desc");
  const sortedFilteredItems = React.useMemo(() => {
    const arr = [...filteredItems];
    if (sortMode === "title_asc") {
      arr.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", "fr", { sensitivity: "base" })
      );
    } else {
      arr.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : -Infinity;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : -Infinity;
        return sortMode === "date_desc" ? tb - ta : ta - tb;
      });
    }
    return arr;
  }, [filteredItems, sortMode]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/policies", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setItems(data.items || []);
      } else {
        console.error("GET /api/policies failed", data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTotal = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/employees/count", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && typeof data.totalEmployees === "number") {
        setTotalEmployees(data.totalEmployees);
      } else {
        setTotalEmployees(null);
      }
    } catch {
      setTotalEmployees(null);
    }
  }, []);

  React.useEffect(() => {
    load();
    loadTotal();
  }, [load, loadTotal]);

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      const res = await fetch(`/api/policies/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        alert("Échec de la suppression.");
      } else {
        load();
      }
    } catch {
      alert("Erreur réseau.");
    }
  }

  async function openAcceptances(doc: PolicyItem) {
    setModalOpen(true);
    setModalTitle(doc.title);
    setAcceptRows([]);
    setAcceptLoading(true);
    setQuery("");
    try {
      const res = await fetch(`/api/policies/${doc.id}/accept`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        alert("Impossible de charger les signatures.");
        setModalOpen(false);
        return;
      }
      const rows: AcceptanceRow[] = (data.items || []).map((r: any) => ({
        fullName: r.fullName || "",
        email: r.email || "",
        acceptedAt: r.acceptedAt,
        ip: r.ip || "",
        userAgent: r.userAgent || "",
      }));
      setAcceptRows(rows);
    } catch {
      alert("Erreur réseau.");
      setModalOpen(false);
    } finally {
      setAcceptLoading(false);
    }
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>("input[type=file]");
    const titleInput = form.querySelector<HTMLInputElement>("input[name=title]");
    const catInput = form.querySelector<HTMLInputElement>("input[name=category]");

    if (!fileInput?.files?.[0] || !titleInput?.value) {
      return alert("Titre et fichier requis");
    }

    const formData = new FormData();
    formData.append("title", titleInput.value);
    formData.append("category", catInput?.value || "");
    formData.append("file", fileInput.files[0]);

    setUploading(true);
    try {
      const res = await fetch("/api/policies", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert("Échec du téléversement");
      } else {
        form.reset();
        load();
      }
    } finally {
      setUploading(false);
    }
  }

  // ✅ Nouvelle fonction : téléchargement PDF via Blob
  async function handleDownload(fileKey: string, title: string) {
    try {
      const res = await fetch(`/api/policy-files/${encodeURIComponent(fileKey)}?download=1`);
      if (!res.ok) throw new Error("Échec du téléchargement");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Téléchargement échoué", err);
      alert("Impossible de télécharger ce PDF.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onUpload} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl">
        <input
          type="text"
          name="title"
          placeholder="Titre du document"
          className="text-sm px-3 py-1.5 rounded-lg border flex-1 min-w-[180px]"
        />
        <input
          type="text"
          name="category"
          placeholder="Catégorie (optionnel)"
          className="text-sm px-3 py-1.5 rounded-lg border flex-1 min-w-[150px]"
        />
        <input type="file" accept="application/pdf" className="text-sm" />
        <button
          type="submit"
          disabled={uploading}
          className="px-3 py-1.5 rounded-lg border text-sm bg-emerald-600 text-white"
        >
          {uploading ? "Téléversement…" : "Ajouter un PDF"}
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Documents — Politiques & Contrats</h2>
          <div className="flex items-center gap-3">
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Rechercher (titre ou catégorie)"
              className="text-sm px-3 py-1.5 rounded-lg border"
            />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="text-sm px-2 py-1.5 rounded-lg border"
            >
              <option value="date_desc">Plus récents</option>
              <option value="date_asc">Plus anciens</option>
              <option value="title_asc">Titre A → Z</option>
            </select>
            {totalEmployees !== null && (
              <div className="text-sm text-gray-600">
                Cible employé·e·s : <b>{totalEmployees}</b>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Chargement…</div>
        ) : sortedFilteredItems.length === 0 ? (
          <div className="text-sm text-gray-500">
            {listQuery ? "Aucun document trouvé." : "Aucun document."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sortedFilteredItems.map((doc) => (
              <li key={doc.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{doc.title}</div>
                  <div className="text-xs text-gray-500">
                    {doc.category} • Ajouté le{" "}
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}
                  </div>
                  <div className="mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {typeof doc.acceptCount === "number" ? doc.acceptCount : 0}
                    {totalEmployees !== null ? ` / ${totalEmployees}` : ""} reconnues
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                    Ouvrir
                  </a>
                  {/* ✅ Bouton modifié */}
                  <button
                    onClick={() => handleDownload(doc.fileKey, doc.title)}
                    className="text-sm underline"
                  >
                    Télécharger
                  </button>
                  <button onClick={() => openAcceptances(doc)} className="text-sm underline">
                    Voir signatures
                  </button>
                  <button onClick={() => onDelete(doc.id)} className="text-sm text-red-600 underline">
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal signatures (inchangée) */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setModalOpen(false)} />
          <div className="relative z-50 bg-white rounded-2xl shadow-xl w-[min(960px,95vw)] max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between gap-2">
              <div>
                <div className="text-sm text-gray-500">Signatures</div>
                <div className="text-lg font-semibold">{modalTitle}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher (nom ou email)"
                  className="text-sm px-3 py-1.5 rounded-lg border"
                />
                <button
                  onClick={() => {
                    const header = ["Nom complet", "Email", "Date", "IP", "User-Agent"];
                    const body = filteredRows.map((r) => [
                      r.fullName,
                      r.email,
                      new Date(r.acceptedAt).toLocaleString(),
                      r.ip,
                      r.userAgent,
                    ]);
                    const csv = [header, ...body]
                      .map((cols) => cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
                      .join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `signatures-${modalTitle}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                  disabled={csvPending || filteredRows.length === 0}
                >
                  {csvPending ? "Export…" : "Export CSV"}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="p-5 overflow-auto">
              {acceptLoading ? (
                <div className="text-sm text-gray-500">Chargement…</div>
              ) : filteredRows.length === 0 ? (
                <div className="text-sm text-gray-500">
                  {query ? "Aucun résultat." : "Aucune signature pour l’instant."}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600 sticky top-0 bg-white">
                    <tr>
                      <th className="py-2 pr-3">Nom</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">IP</th>
                      <th className="py-2">User-Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 pr-3">{r.fullName || "—"}</td>
                        <td className="py-2 pr-3">{r.email || "—"}</td>
                        <td className="py-2 pr-3">{new Date(r.acceptedAt).toLocaleString()}</td>
                        <td className="py-2 pr-3">{r.ip || "—"}</td>
                        <td className="py-2">{r.userAgent || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
