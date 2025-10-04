"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";

/* ---------------- Types ---------------- */
type ChapterStat = {
  chapterNo: number;
  title: string;
  completed: number;
  total: number;
  pct: number;
  lastActive?: string | null;
};

type Props = {
  userId: string | null;
  onClose: () => void;
};

/* ---------------- Helpers ---------------- */
function daysSince(date?: string | null) {
  if (!date) return "—";
  const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

/* ---------------- Progress bar locale ---------------- */
function GradientBar({ pct, height = 8 }: { pct: number; height?: number }) {
  const GRADIENT = "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal";
  return (
    <div className="w-full rounded-full bg-gray-100">
      <div
        className={`${GRADIENT} rounded-full transition-all`}
        style={{ width: `${pct}%`, height }}
      />
    </div>
  );
}

/* ---------------- Composant principal ---------------- */
export default function EmployeeDetailModal({ userId, onClose }: Props) {
  const [stats, setStats] = useState<ChapterStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/manager/employee/${userId}/chapter-stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.data?.chapters)) {
          setStats(data.data.chapters);
          setDetailErr(null);
        } else {
          setDetailErr("Réponse inattendue");
        }
      })
      .catch(() => setDetailErr("Erreur de connexion"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return (
    <Dialog open={!!userId} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 grid place-items-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6">
          {/* Titre principal */}
          <Dialog.Title className="text-lg font-bold mb-4">
            Progression par chapitre
          </Dialog.Title>

          {/* Corps du modal */}
          {loading ? (
            <div className="text-sm text-gray-600">Chargement des chapitres…</div>
          ) : detailErr ? (
            <div className="text-sm text-red-600">Erreur : {detailErr}</div>
          ) : (
            <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
              {stats.map((ch) => (
                <div
                  key={ch.chapterNo}
                  className="border rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      Chapitre {ch.chapterNo} — {ch.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      {ch.completed}/{ch.total}
                    </div>
                  </div>

                  <div className="mt-2">
                    <GradientBar pct={ch.pct ?? 0} height={8} />
                  </div>

                  {ch.lastActive && (
                    <div className="mt-1 text-xs text-gray-500">
                      Dernière activité : {daysSince(ch.lastActive)} j
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bas du modal */}
          <div className="mt-6 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white text-sm font-semibold hover:opacity-95 transition"
            >
              Fermer
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
