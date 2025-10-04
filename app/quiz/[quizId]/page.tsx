"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { LEVELS, type LevelKey } from "@/lib/curriculum";
import * as PL from "@/lib/progressLocal";
import { upsertProgressServer } from "@/lib/progressServer";

function mkModuleCode(levelKey: string, chapterId: string, subjectId: string) {
  return `${levelKey}::${chapterId}::${subjectId}`;
}

function useQuizData(quizId: string | null) {
  const data = useMemo(() => {
    if (!quizId) return null;
    return {
      id: quizId,
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: `${quizId}-${i + 1}`,
        text: `Question ${i + 1}`,
        correct: Math.random() > 0.5,
      })),
    };
  }, [quizId]);
  return data;
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams<{ quizId: string }>();
  const sp = useSearchParams();

  const quizId = params?.quizId || null;
  const levelKey = (sp.get("level") || "Niveau 1") as LevelKey;
  const chapterId = sp.get("chapter") || "1";
  const subjectId = sp.get("subject") || quizId || "sujet";

  const quiz = useQuizData(subjectId);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scorePct, setScorePct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const devPanel =
    sp.get("dev") === "1" || (typeof process !== "undefined" && process.env.NODE_ENV === "development");

  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    setScorePct(null);
  }, [subjectId]);

  function toggleAnswer(qid: string) {
    setAnswers((m) => ({ ...m, [qid]: !m[qid] }));
  }

  async function pushServer(pct: number, attemptsInc = 1) {
    const s = PL.getSubjectState(levelKey, chapterId, subjectId);
    const attempts = (s.attemptsSinceWatch ?? 0) + attemptsInc;

    PL.setSubjectState(levelKey, chapterId, subjectId, {
      watched: true,
      attemptsSinceWatch: attempts,
      pct: Math.max(s.pct ?? 0, pct),
    });

    setSaving(true);
    try {
      const code = mkModuleCode(levelKey, chapterId, subjectId);
      await upsertProgressServer({
        moduleCode: code,
        levelKey,
        chapterId,
        watched: true,
        attempts,
        pct: Math.max(s.pct ?? 0, pct),
        lastAttemptAt: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (!quiz) return;
    setSubmitted(true);
    const correct = quiz.questions.filter((q) => !!answers[q.id] === q.correct).length;
    const pct = Math.round((correct / (quiz.questions.length || 1)) * 100);
    setScorePct(pct);
    await pushServer(pct, 1);

    // redirection douce après 1.5s
    setTimeout(() => router.push("/employee"), 1500);
  }

  function fillGoodAnswers() {
    if (!quiz) return;
    const next: Record<string, boolean> = {};
    for (const q of quiz.questions) next[q.id] = q.correct;
    setAnswers(next);
  }

  async function submitWithScore(pct: number) {
    setSubmitted(true);
    setScorePct(pct);
    await pushServer(pct, 1);
    setTimeout(() => router.push("/employee"), 1000);
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Quiz — {subjectId}</h1>
      <div className="text-sm text-gray-600 mb-2">
        {levelKey} — Chapitre {chapterId}
      </div>

      {devPanel && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="font-semibold mb-1">Mode développeur</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={fillGoodAnswers} className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 hover:bg-emerald-100">
              Remplir bonnes réponses
            </button>
            <button onClick={() => submitWithScore(95)} className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 hover:bg-emerald-100">
              Réussite (95 %)
            </button>
            <button onClick={() => submitWithScore(50)} className="rounded-md border border-amber-300 bg-white px-3 py-1.5 hover:bg-amber-100">
              Échec (50 %)
            </button>
          </div>
          <div className="mt-2 text-xs text-emerald-800">Astuce : ajoute <code>?dev=1</code> à l’URL si le panneau ne s’affiche pas.</div>
        </div>
      )}

      {!quiz ? (
        <div className="text-gray-600">Chargement du quiz…</div>
      ) : (
        <>
          <ul className="space-y-3 my-4">
            {quiz.questions.map((q) => (
              <li key={q.id} className="border rounded-lg p-3 flex items-center gap-3">
                <input type="checkbox" checked={!!answers[q.id]} onChange={() => toggleAnswer(q.id)} />
                <span className="text-sm">{q.text}</span>
              </li>
            ))}
          </ul>

          {!submitted ? (
            <button
              onClick={onSubmit}
              className="rounded-xl px-4 py-2 font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal"
              disabled={saving}
            >
              Soumettre mes réponses
            </button>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="text-lg">
                Score : <b>{scorePct ?? 0}%</b> {saving ? "(enregistrement…)" : ""}
              </div>
              <button
                onClick={() => router.push("/employee")}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                ← Retour à ma formation
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
