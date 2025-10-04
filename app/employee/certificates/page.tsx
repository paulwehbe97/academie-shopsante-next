"use client";

import { useEffect, useMemo, useState } from "react";

type CertRow = {
  id: string;
  levelKey: string;
  chapterId: string;
  chapterTitle: string;
  filePath: string;     // ex: /certs/{userId}/{file}.pdf
  issuedAt: string;     // ISO
  sentAt?: string | null;
};

const GRADIENT = "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal";

function DocIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M7 3h6l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M13 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function formatDateFR(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function CertificatesPage() {
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CertRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch("/api/certificates/mine", { credentials: "include", cache: "no-store" });
        const data = await resp.json();
        if (!resp.ok || !data?.ok) {
          throw new Error(data?.error || "load_failed");
        }
        if (mounted) {
          // tri décroissant par date d’émission
          const list: CertRow[] = (data.items || []).sort(
            (a: CertRow, b: CertRow) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
          );
          setRows(list);
        }
      } catch (e) {
        if (mounted) setError("Impossible de charger vos certificats.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      // Skeleton
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white/70 p-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded bg-neutral-200" />
                <div className="h-4 w-1/4 rounded bg-neutral-200" />
                <div className="ml-auto h-3 w-24 rounded bg-neutral-200" />
              </div>
              <div className="mt-3 h-3 w-1/2 rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-neutral-700">
          Aucun certificat pour le moment.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-neutral-500">
                <DocIcon />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm text-neutral-600">
                    {r.levelKey} — Chapitre {r.chapterId}
                  </div>
                  <div className="truncate text-base font-semibold text-neutral-900">
                    {r.chapterTitle}
                  </div>
                  {r.sentAt ? (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      Envoyé par courriel
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 text-xs text-neutral-500">
                  Émis le {formatDateFR(r.issuedAt)}
                  {r.sentAt ? ` · Courriel le ${formatDateFR(r.sentAt)}` : null}
                </div>

                <div className="mt-3">
                  <a
                    href={r.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-sm font-semibold text-black shadow-md ${GRADIENT}`}
                  >
                    Télécharger le PDF
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [loading, error, rows]);

  if (!hydrated) return <div className="min-h-[200px]" />;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Mes certificats</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Tes certificats s’affichent ici dès qu’un chapitre est réussi (≥ 90&nbsp;% sur tous ses sujets).
      </p>
      <div className="mt-6">{content}</div>
    </main>
  );
}
