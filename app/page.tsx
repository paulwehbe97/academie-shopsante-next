'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { cn, slugify, shuffle } from '../lib/utils';
import { CHAPTERS } from '../data/chapters';
import { VITAMIN_QUESTIONS } from '../data/quizzes/vitamines';
import { RULES } from '../config/rules';
import { STORES } from '../data/stores';
import { loadUIState, saveUIState } from '../lib/local';

/* ===================== Types ===================== */
type Role = 'Employé' | 'Gérant' | 'Admin';
type ProgressState = 'todo' | 'in_progress' | 'done';
type Progress = Record<string, { status: ProgressState; score?: number }>;

/* ===================== Helpers ===================== */
const moduleCode = (chapter: number, title: string) => `n1-c${chapter}-${slugify(title)}`;

const isChapterCompleted = (chNo: number, progress: Progress) => {
  const ch = CHAPTERS.find((c) => c.no === chNo);
  if (!ch) return false;
  return ch.modules.every((m) => progress[moduleCode(chNo, m)]?.status === 'done');
};

/* ===================== Page ===================== */
export default function Page() {
  const { data: session } = useSession();

  // Clé de persistance par utilisateur
  const storageKey = useMemo(() => session?.user?.email ?? 'demo', [session?.user?.email]);

  // Hydratation (SSR → CSR guard)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Chargement initial (clé courante)
  const initial = useMemo(() => {
    if (typeof window === 'undefined') return {};
    return loadUIState(storageKey) ?? {};
  }, [storageKey]);

  // États de navigation & progression
  const [route, setRoute] = useState<'login' | 'employee' | 'module' | 'quiz' | 'manager' | 'admin'>(
    (initial as any).route ?? 'login'
  );
  const [role, setRole] = useState<Role>((initial as any).role ?? 'Employé');
  const [currentModule, setCurrentModule] = useState<{ chapter: number; title: string }>(
    (initial as any).currentModule ?? { chapter: 1, title: 'Vitamines' }
  );
  const [progress, setProgress] = useState<Progress>((initial as any).progress ?? {});

  // Bandeau d'invitation via querystring
  const [pendingInvite, setPendingInvite] = useState<
    | null
    | {
        inviteId: string;
        email: string;
        role: Role;
        store: string;
      }
  >(null);

  // 🔒 Garde de route basée sur la session et le rôle
useEffect(() => {
  const user = session?.user as any | undefined;
  const userRole = user?.role as ("Employé" | "Gérant" | "Admin" | undefined);

  // 1) Non authentifié → route = "login"
  if (!user) {
    if (route !== "login") setRoute("login");
    return;
  }

  // 2) Authentifié → route cohérente avec le rôle
  if (route === "manager" && userRole !== "Gérant") {
    setRoute(userRole === "Admin" ? "admin" : "employee");
    return;
  }
  if (route === "admin" && userRole !== "Admin") {
    setRoute(userRole === "Gérant" ? "manager" : "employee");
    return;
  }

  // Optionnel : si tu veux interdire l’employé d’accéder à 'employee' quand il est Gérant/Admin,
  // tu peux aussi forcer ici. Je laisse permissif (Gérant/Admin peuvent voir employee si tu veux).
}, [route, session?.user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const inv = sp.get('invite');
    const email = sp.get('email');
    const roleParam = sp.get('role') as Role | null;
    const store = sp.get('store');
    if (inv && email && store) {
      setPendingInvite({
        inviteId: inv,
        email,
        role: (roleParam ?? 'Employé') as Role,
        store,
      });
    }
  }, []);

  // Notifier la TopBar (affichée globalement) du changement de route/role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ui:route'));
    }
  }, []);

  // Rechargement si la storageKey change (connexion/déconnexion)
  useEffect(() => {
    const ui = loadUIState(storageKey);
    if (!ui) return;
    if (ui.route !== undefined) setRoute(ui.route as any);
    if (ui.role !== undefined) setRole(ui.role as Role);
    if (ui.currentModule !== undefined) setCurrentModule(ui.currentModule as any);
    if (ui.progress !== undefined) setProgress(ui.progress as Progress);
  }, [storageKey]);

  // Sauvegardes + signal TopBar
  useEffect(() => {
    saveUIState({ route }, storageKey);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ui:route'));
  }, [route, storageKey]);
  useEffect(() => {
    saveUIState({ role }, storageKey);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ui:route'));
  }, [role, storageKey]);
  useEffect(() => {
    saveUIState({ currentModule }, storageKey);
  }, [currentModule, storageKey]);
  useEffect(() => {
    saveUIState({ progress }, storageKey);
  }, [progress, storageKey]);

  const foundationsDone = isChapterCompleted(1, progress) && isChapterCompleted(2, progress);

  // [CERTIFICAT — helper d’envoi automatique + persistance MVP]
  const maybeIssueCertificate = React.useCallback(
    async (chNo: number, nextProgress: Progress) => {
      // 1) Le chapitre est-il complet ?
      if (!isChapterCompleted(chNo, nextProgress)) return;

      // 2) Anti-doublon (1 certificat / chapitre / utilisateur)
      const issuedKey = `cert_issued_n1_c${chNo}_${storageKey}`;
      if (typeof window !== "undefined" && localStorage.getItem(issuedKey) === "1") return;

      // 3) Infos utilisateur + chapitre
      const ch = CHAPTERS.find((c) => c.no === chNo);
      const to = session?.user?.email || "";
      const name =
        session?.user?.name ||
        (session?.user?.email ? session.user.email.split("@")[0] : "Employé Shop Santé");
      if (!to || !ch) return;

      // Petit utilitaire local pour aligner le nom de fichier avec l'API
      const sanitizeFilename = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "_").substring(0, 80);

      try {
        // 4) Envoi email (non bloquant)
        await fetch("/api/certificates/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            module: ch.title,     // Nom du module/chapitre affiché sur le PDF
            chapter: String(chNo),
            to,
          }),
        });

        // 5) Persiste l’historique (MVP localStorage)
        if (typeof window !== "undefined") {
          const listKey = `certificates:${storageKey}`;
          const nowIso = new Date().toISOString();
          const filename = `certificat_N1_C${sanitizeFilename(String(chNo))}_${sanitizeFilename(ch.title)}_${sanitizeFilename(name)}.pdf`;
          const rec = {
            id: `n1-c${chNo}-${slugify(ch.title)}`,
            level: 1 as const,
            chapter: chNo,
            module: ch.title,
            title: ch.title,     // alias module
            date: nowIso,
            filename,
          };

          let list: any[] = [];
          try { list = JSON.parse(localStorage.getItem(listKey) || "[]"); } catch {}
          // Évite le doublon si déjà présent pour ce chapitre
          const exists = list.some((x) => x.id === rec.id);
          if (!exists) list.unshift(rec);
          localStorage.setItem(listKey, JSON.stringify(list));

          // Marque anti-doublon d’envoi
          localStorage.setItem(issuedKey, "1");
        }
      } catch (e) {
        console.error("Certificate send failed", e);
      }
    },
    [session?.user?.email, session?.user?.name, storageKey]
  );


async function acceptInvite() {
  if (!pendingInvite) return;
  const { inviteId, email, role: roleFromLink, store } = pendingInvite;
  try {
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId, email }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Accept failed");
    }

    // Nettoie l’URL et l’état local
    const url = new URL(window.location.href);
    ["invite", "email", "role", "store"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
    setPendingInvite(null);

    // Redirige selon le rôle invité (par défaut Employé)
    const r = (data.role as Role) || roleFromLink || "Employé";
    setRole(r);
    setRoute(r === "Gérant" ? "manager" : r === "Admin" ? "admin" : "employee");
  } catch (e) {
    console.warn("acceptInvite error", e);
    alert("Impossible d'accepter l'invitation. Réessaie plus tard ou contacte un admin.");
  }
}


  function dismissInvite() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    ['invite', 'email', 'role', 'store'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, '', url.toString());
    setPendingInvite(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal">
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* ⛳ Garde d’hydratation : structure SSR/CSR identique */}
        {!hydrated ? (
          <div className="min-h-[120px]" />
        ) : (
          <>
            {/* Bandeau d’invitation */}
            {pendingInvite && (
              <div className="mb-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-4 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-semibold">Invitation détectée</div>
                    <div className="opacity-80">
                      {pendingInvite.email} — {pendingInvite.role} — Boutique {pendingInvite.store}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={acceptInvite}>Accepter</Button>
                    <Button variant="subtle" onClick={dismissInvite}>
                      Ignorer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Routes */}
            {route === 'login' && (
              <LoginCard
                onLogin={(r: Role = 'Employé') => {
                  setRole(r);
                  setRoute(r === 'Employé' ? 'employee' : r === 'Gérant' ? 'manager' : 'admin');
                }}
              />
            )}

            {route === 'employee' && (
              <EmployeeHome
                progress={progress}
                foundationsDone={foundationsDone}
                onOpenModule={(chapter: number, title: string) => {
                  setCurrentModule({ chapter, title });
                  setRoute('module');
                }}
              />
            )}

            {route === 'module' && (
              <ModuleView
                currentModule={currentModule}
                progress={progress}
                onStartQuiz={() => setRoute('quiz')}
                onBack={() => setRoute('employee')}
              />
            )}

            {route === 'quiz' && (
              <QuizView
                currentModule={currentModule}
                onBack={() => setRoute('module')}
                onComplete={(score: number, passed: boolean) => {
                  const code = moduleCode(currentModule.chapter, currentModule.title);
                  setProgress((prev: Progress) => {
                    const updated: Progress = {
                      ...prev,
                      [code]: { status: passed ? 'done' : 'in_progress', score },
                    };
                    if (passed) {
                      void maybeIssueCertificate(currentModule.chapter, updated);
                    }
                    return updated;
                  });
                  setRoute('employee');
                }}
              />
            )}

            {route === 'manager' && <ManagerDashboard onBack={() => setRoute('login')} />}

            {route === 'admin' && <AdminInvites onBack={() => setRoute('login')} />}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ===================== UI PRIMITIVES ===================== */
function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white/90 rounded-2xl shadow-xl border border-gray-100 p-6', className)}>{children}</div>;
}

function Pill({ children, color = 'bg-gray-100 text-gray-700' }: { children: React.ReactNode; color?: string }) {
  return <span className={cn('px-2 py-1 rounded-full text-xs font-medium', color)}>{children}</span>;
}

function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'subtle';
  className?: string;
  disabled?: boolean;
}) {
  const base = 'px-4 py-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    {
      primary: 'bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white hover:opacity-95',
      ghost: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
      subtle: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    }[variant] || '';
  return (
    <button className={cn(base, styles, className)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* ===================== Sections ===================== */
function LoginCard({ onLogin }: { onLogin: (r: Role) => void }) {
  const [email, setEmail] = useState(''); // démo
  const [pwd, setPwd] = useState(''); // démo
  const [r, setR] = useState<Role>('Employé'); // rôle démo

  const [magicEmail, setMagicEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendMagicLink() {
    setMsg(null);
    const e = magicEmail.trim();
    if (!e) {
      setMsg('Entre une adresse email valide.');
      return;
    }
    try {
      setSending(true);
      const res = await signIn('email', { email: e, redirect: false });
      if (!res || (res as any).error) {
        setMsg("Échec de l’envoi du lien. Vérifie l’adresse (domaine autorisé) ou réessaie.");
      } else {
        setMsg('Lien envoyé. Consulte ta boîte de réception (et Indésirables).');
      }
    } catch {
      setMsg('Une erreur s’est produite. Réessaie.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Bienvenue dans l’<span className="text-brand-700">Académie Shop Santé</span>
        </h1>
        <p className="text-gray-600 mt-3">
          Plateforme interne : vidéos courtes, quiz auto-corrigés, progression guidée. Règle N1 :
          <b> ≥ {RULES.passMark}%</b>, <b>{RULES.maxAttempts} tentatives</b>, sinon revoir la vidéo.
          Ch.1 &amp; Ch.2 obligatoires, puis chapitres 3–8 ouverts (ordre intra-chapitre).
        </p>
        <div className="flex gap-2 mt-6">
          <Pill color="bg-emerald-100 text-emerald-700">Invitations Admin/Gérant</Pill>
          <Pill color="bg-blue-100 text-blue-700">Certificats PDF</Pill>
          <Pill color="bg-amber-100 text-amber-700">Rappels J+10/J+20/J+30</Pill>
        </div>
      </div>

      <Card>
        <h2 className="font-bold text-xl mb-4">Connexion</h2>

        {/* Démo rôle local */}
        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (démo)"
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <input
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe (démo)"
            type="password"
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <div className="text-sm text-gray-500">(Démo) Choisir un rôle pour l’aperçu :</div>
          <div className="flex gap-2">
            {(['Employé', 'Gérant', 'Admin'] as Role[]).map((x) => (
              <button
                key={x}
                onClick={() => setR(x)}
                className={cn(
                  'px-3 py-1 rounded-lg border',
                  r === x ? 'bg-brand-600 text-white border-brand-600' : 'bg-white hover:bg-gray-50'
                )}
              >
                {x}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={() => onLogin(r)}>
            Se connecter (démo)
          </Button>
          <button className="text-sm text-brand-700 hover:underline">Mot de passe oublié ?</button>
        </div>

        {/* séparateur */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* SSO */}
        <div className="grid gap-2">
          <button
            onClick={() => signIn('google')}
            className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold"
          >
            Continuer avec Google
          </button>
          <button
            onClick={() => signIn('azure-ad')}
            className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold"
          >
            Continuer avec Microsoft
          </button>
        </div>

        {/* séparateur */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* Lien magique */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Se connecter par email</label>
          <div className="flex gap-2">
            <input
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              placeholder="votre@email.com"
              className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <Button onClick={sendMagicLink} disabled={sending}>
              {sending ? 'Envoi...' : 'Recevoir un lien'}
            </Button>
          </div>
          {msg && <div className="text-sm text-gray-600">{msg}</div>}
          <div className="text-xs text-gray-500">
            Le lien est valable 1 heure. Certains domaines peuvent être restreints (voir <code>ALLOWED_MAGIC_DOMAINS</code>).
          </div>
        </div>
      </Card>
    </div>
  );
}

function EmployeeHome({
  progress,
  onOpenModule,
  foundationsDone,
}: {
  progress: Progress;
  onOpenModule: (c: number, t: string) => void;
  foundationsDone: boolean;
}) {
  const totalModules = CHAPTERS.reduce((n, c) => n + c.modules.length, 0);
  const completed = Object.values(progress).filter((p) => p.status === 'done').length;
  const pct = Math.round((completed / totalModules) * 100);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-700">Parcours employé</div>
            <div className="text-2xl font-bold text-white drop-shadow">Niveau 1 — Progression : {pct}%</div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="h-3 bg-white/40 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: pct + '%' }}></div>
            </div>
            <div className="text-xs text-white/90 mt-1">
              {completed}/{totalModules} modules complétés
            </div>
          </div>
        </div>
      </Card>

      {CHAPTERS.map((ch) => (
        <Card key={ch.no}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 grid place-items-center rounded-xl bg-brand-100 text-brand-700 font-bold">{ch.no}</div>
              <div>
                <div className="font-bold">
                  Chapitre {ch.no} — {ch.title}
                </div>
                {ch.mandatory ? (
                  <Pill color="bg-indigo-100 text-indigo-700">Obligatoire en premier</Pill>
                ) : !foundationsDone ? (
                  <Pill color="bg-gray-100 text-gray-500">Verrouillé (finir Ch.1 & Ch.2)</Pill>
                ) : (
                  <Pill color="bg-emerald-100 text-emerald-700">Disponible</Pill>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ch.modules.map((m: string, idx: number) => {
              const code = moduleCode(ch.no, m);
              const state: ProgressState = (progress[code]?.status || 'todo') as ProgressState;

              const mustLockByFoundation = !ch.mandatory && !foundationsDone;
              const prevCode = idx > 0 ? moduleCode(ch.no, ch.modules[idx - 1]) : null;
              const mustLockByOrder = idx > 0 && progress[prevCode!]?.status !== 'done';
              const locked = mustLockByFoundation || mustLockByOrder;

              return (
                <div key={m} className={cn('border rounded-2xl p-4', locked ? 'opacity-60' : 'bg-white')}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{m}</div>
                    {state === 'done' ? (
                      <Pill color="bg-emerald-100 text-emerald-700">Réussi</Pill>
                    ) : state === 'in_progress' ? (
                      <Pill color="bg-amber-100 text-amber-700">En cours</Pill>
                    ) : (
                      <Pill>À faire</Pill>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Vidéo + Quiz (10 Q, ≥ {RULES.passMark} %)</div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" disabled={locked} onClick={() => onOpenModule(ch.no, m)}>
                      {state === 'done' ? 'Réviser' : 'Continuer'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ModuleView({
  currentModule,
  onStartQuiz,
  onBack,
  progress,
}: {
  currentModule: { chapter: number; title: string };
  onStartQuiz: () => void;
  onBack: () => void;
  progress: Progress;
}) {
  const code = moduleCode(currentModule.chapter, currentModule.title);
  const state = progress[code]?.status;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        ← Retour
      </Button>
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <div className="mb-3">
            <div className="text-sm text-gray-500">Module</div>
            <h2 className="text-2xl font-bold">{currentModule.title}</h2>
          </div>
          <div className="aspect-video w-full rounded-2xl bg-gray-100 grid place-items-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-2">▶️</div>
              <div>Emplacement de la vidéo MP4 (hébergée sur la plateforme)</div>
              <div className="text-xs text-gray-400">(Aperçu de démonstration)</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={onStartQuiz}>{state === 'done' ? 'Repasser le quiz' : 'Commencer le quiz'}</Button>
            <Button variant="subtle">Télécharger la fiche PDF</Button>
          </div>
        </Card>

        <Card>
          <div className="font-semibold mb-2">Règles du quiz (N1)</div>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>{(RULES as any).n1FixedQuestions ?? 10} questions auto-corrigées</li>
            <li>Questions & choix mélangés à chaque tentative</li>
            <li>
              <b>Réussite ≥ {RULES.passMark}%</b> — <b>{RULES.maxAttempts} tentatives</b> maximum
            </li>
            <li>Si échec deux fois : revoir la vidéo pour réessayer</li>
            <li>1ère tentative &lt; {RULES.passMark}% : on montre seulement les questions manquées</li>
            <li>≥ {RULES.passMark}% : on affiche erreurs + explications</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function QuizView({
  currentModule,
  onBack,
  onComplete,
}: {
  currentModule: { chapter: number; title: string };
  onBack: () => void;
  onComplete: (score: number, passed: boolean) => void;
}) {
  const [attempt, setAttempt] = useState<number>(1);
  const [seed, setSeed] = useState<number>(() => Math.random());
  const [answers, setAnswers] = useState<Record<number, string | Set<string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);

  const questions = useMemo(() => {
    const rng = shuffle([...(VITAMIN_QUESTIONS as any[])]);
    return rng.map((q: any) => ({
      ...q,
      choices: q.choices ? shuffle(q.choices) : q.choices,
      correct:
        q.type === 'QCM'
          ? q.correct instanceof Set
            ? q.correct
            : new Set(Array.isArray(q.correct) ? q.correct : String(q.correct).split(';').map((s) => s.trim()))
          : q.correct,
    }));
  }, [seed, attempt]);

  const total = questions.length;

  const toggleSelect = (qid: number, choice: string, type: 'QCM' | 'QCU' | 'VF') => {
    setAnswers((prev) => {
      const cur = prev[qid];
      if (type === 'QCM') {
        const next = new Set(Array.from((cur as Set<string>) || []));
        if (next.has(choice)) next.delete(choice);
        else next.add(choice);
        return { ...prev, [qid]: next };
      } else {
        return { ...prev, [qid]: choice };
      }
    });
  };

  const evaluate = () => {
    let ok = 0;
    const wrongIds: number[] = [];
    for (const q of questions) {
      const ans = answers[q.id];
      if (q.type === 'QCU' || q.type === 'VF') {
        const good = ans === (q.correct as string);
        if (good) ok++;
        else wrongIds.push(q.id);
      } else if (q.type === 'QCM') {
        const a = new Set(Array.from((ans as Set<string>) || []));
        const c = q.correct as Set<string>;
        const good = a.size === c.size && Array.from(c).every((x) => a.has(x));
        if (good) ok++;
        else wrongIds.push(q.id);
      }
    }
    const pct = Math.round((ok / total) * 100);
    setScore(pct);
    setMissed(wrongIds);
    setSubmitted(true);
  };

  const passed = score >= RULES.passMark;

  const retry = () => {
    if (attempt === 1) {
      setAttempt(2);
      setAnswers({});
      setSubmitted(false);
      setSeed(Math.random());
    } else {
      setLocked(true);
    }
  };

  const reviewVideo = () => {
    setAttempt(1);
    setAnswers({});
    setSubmitted(false);
    setLocked(false);
    setScore(0);
    setMissed([]);
    setSeed(Math.random());
  };

  function formatCorrect(q: any) {
    if (q.type === 'QCM') return Array.from(q.correct as Set<string>).join(', ');
    return q.correct as string;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Retour
        </Button>
        <div className="text-sm text-gray-500">
          Tentative {attempt} / {RULES.maxAttempts}
        </div>
      </div>
      <Card>
        <div className="mb-2">
          <div className="text-sm text-gray-500">Quiz</div>
          <h2 className="text-2xl font-bold">{currentModule.title}</h2>
        </div>

        {questions.map((q: any, idx: number) => (
          <div key={q.id} className="py-4 border-t first:border-t-0">
            <div className="font-semibold mb-2">
              {idx + 1}. {q.prompt}
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              {q.choices.map((ch: string) => {
                const sel = answers[q.id];
                const checked = q.type === 'QCM' ? (sel instanceof Set ? sel.has(ch) : false) : sel === ch;

                if (q.type === 'QCM') {
                  return (
                    <label key={ch} className="flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={submitted}
                        checked={checked}
                        onChange={() => !submitted && toggleSelect(q.id, ch, 'QCM')}
                      />
                      <span>{ch}</span>
                    </label>
                  );
                }

                return (
                  <label key={ch} className="flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      disabled={submitted}
                      checked={checked}
                      onChange={() => !submitted && toggleSelect(q.id, ch, q.type)}
                    />
                    <span>{ch}</span>
                  </label>
                );
              })}
            </div>

            {submitted && (
              <div className="mt-2 text-sm">
                {passed ? (
                  missed.includes(q.id) ? (
                    <div className="text-brand-700">
                      ❌ Mauvaise réponse — Bonne réponse attendue : <b>{formatCorrect(q)}</b>
                    </div>
                  ) : (
                    <div className="text-emerald-700">✅ Correct</div>
                  )
                ) : missed.includes(q.id) ? (
                  <div className="text-brand-700">❌ À revoir</div>
                ) : (
                  <div className="text-emerald-700">✅</div>
                )}
              </div>
            )}
          </div>
        ))}

        {!submitted ? (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">Questions et choix mélangés à chaque tentative</div>
            <Button onClick={evaluate}>Soumettre mes réponses</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-6">
            <div>
              <div className="text-xl font-extrabold">Score : {score}%</div>
              {passed ? (
                <div className="text-emerald-700 text-sm">
                  Bravo ! Vous avez atteint ≥ {RULES.passMark} %. Le module est validé.
                </div>
              ) : attempt === 1 ? (
                <div className="text-amber-700 text-sm">
                  Résultat &lt; {RULES.passMark} %. Vous pouvez retenter une 2e fois. (Nous affichons seulement les questions à
                  revoir.)
                </div>
              ) : (
                <div className="text-brand-700 text-sm">2 tentatives utilisées. Veuillez revoir la vidéo pour réessayer.</div>
              )}
            </div>
            <div className="flex gap-2">
              {!passed && attempt === 1 && (
                <Button variant="subtle" onClick={retry}>
                  Retenter
                </Button>
              )}
              {!passed && attempt === 2 && (
                <Button variant="subtle" onClick={reviewVideo}>
                  Revoir la vidéo
                </Button>
              )}
              <Button onClick={() => onComplete(score, passed)}>{passed ? 'Continuer' : 'Terminer'}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ManagerDashboard({ onBack }: { onBack: () => void }) {
  // ⚙️ Session & hydratation (aucun return anticipé)
  const { data: session } = useSession();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Boutique du gérant depuis la session (fallback non bloquant)
  const MANAGER_STORE = useMemo(() => {
    const u = (session?.user ?? {}) as any;
    return {
      code: (u.storeCode ?? "") as string,
      name: (u.storeName ?? "Votre boutique") as string,
    };
  }, [session?.user]);

  type ProgressMap = Record<string, ProgressState>;
  type Employee = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    storeCode: string;
    progress: ProgressMap;
    lastActive: string;
    lastReminderAt?: string;
  };

  type Invite = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "Employé";
    storeCode: string;
    storeName: string;
    hireDate?: string;
    status: "pending" | "revoked" | "accepted";
    invitedAt: string;
  };

  const fullName = (e: Employee) => `${e.firstName} ${e.lastName}`;
  const daysSince = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return isNaN(d) ? 0 : d;
  };

  function computePct(p: ProgressMap): { pct: number; done: number; total: number } {
    const allCodes: string[] = [];
    CHAPTERS.forEach((ch) => ch.modules.forEach((m) => allCodes.push(`n1-c${ch.no}-${slugify(m)}`)));
    const total = allCodes.length;
    const done = allCodes.filter((c) => p[c] === "done").length;
    return { pct: Math.round((done / total) * 100), done, total };
  }

  function chapterBreakdown(p: ProgressMap) {
    return CHAPTERS.map((ch) => {
      const codes = ch.modules.map((m) => `n1-c${ch.no}-${slugify(m)}`);
      const total = codes.length;
      const done = codes.filter((c) => p[c] === "done").length;
      return { no: ch.no, title: ch.title, done, total };
    });
  }

  function seedProgress(percent: number): ProgressMap {
    const map: ProgressMap = {};
    const all: string[] = [];
    CHAPTERS.forEach((ch) => ch.modules.forEach((m) => all.push(`n1-c${ch.no}-${slugify(m)}`)));
    const n = Math.floor((percent / 100) * all.length);
    all.forEach((code, i) => {
      map[code] = i < n ? "done" : "todo";
    });
    return map;
  }

  const DEFAULT_EMPLOYEES: Employee[] = [
    {
      id: "e1",
      firstName: "Alex",
      lastName: "Fortin",
      email: "alex@shopsante.ca",
      storeCode: "QC01",
      progress: seedProgress(18),
      lastActive: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    },
    {
      id: "e2",
      firstName: "Marie",
      lastName: "Tremblay",
      email: "marie@shopsante.ca",
      storeCode: "QC01",
      progress: seedProgress(62),
      lastActive: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    },
    {
      id: "e3",
      firstName: "Julie",
      lastName: "Gagnon",
      email: "julie@shopsante.ca",
      storeCode: "QC01",
      progress: seedProgress(40),
      lastActive: new Date(Date.now() - 15 * 86_400_000).toISOString(),
    },
  ];

  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window === "undefined") return DEFAULT_EMPLOYEES;
    const raw = localStorage.getItem("employees");
    return raw ? (JSON.parse(raw) as Employee[]) : DEFAULT_EMPLOYEES;
  });
  useEffect(() => {
    try {
      localStorage.setItem("employees", JSON.stringify(employees));
    } catch {}
  }, [employees]);

  const [selected, setSelected] = useState<Employee | null>(null);

  function exportCSV() {
    const rows = [
      ["Nom", "Email", "Boutique", "Progression (%)", "Complétés/Total", "Dernière activité (jours)"],
      ...employees
        .filter((e) => !MANAGER_STORE.code || e.storeCode === MANAGER_STORE.code)
        .map((e) => {
          const { pct, done, total } = computePct(e.progress);
          return [fullName(e), e.email, e.storeCode, String(pct), `${done}/${total}`, String(daysSince(e.lastActive))];
        }),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipe_${MANAGER_STORE.code || "boutique"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Relance (envoi réel via l'API + mise à jour locale)
  async function sendReminder(e: Employee, daysInactive: number) {
    const { pct } = computePct(e.progress);
    if (pct >= 100) return;

    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: e.email,
          name: fullName(e),
          daysInactive,
          levelComplete: pct >= 100,
          storeCode: e.storeCode,
          storeName: MANAGER_STORE.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data as any)?.ok === false) throw new Error((data as any)?.error || "Send failed");

      setEmployees((prev) => prev.map((x) => (x.id === e.id ? { ...x, lastReminderAt: new Date().toISOString() } : x)));
    } catch (err) {
      console.warn("Reminder error", e.email, err);
    }
  }

  const isDue = (e: Employee) => daysSince(e.lastActive) >= 10 && (!e.lastReminderAt || daysSince(e.lastReminderAt) >= 10);

  // Envoi auto quotidien (anti-spam: 1/jour)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const todayKey = "autoRemindersRun:" + new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(todayKey)) return;

    (async () => {
      for (const e of employees) {
        const inactive = daysSince(e.lastActive);
        const due = inactive >= 10 && (!e.lastReminderAt || daysSince(e.lastReminderAt) >= 10);
        const { pct } = computePct(e.progress);
        if (due && pct < 100) {
          await sendReminder(e, inactive);
        }
      }
      localStorage.setItem(todayKey, "1");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // une fois au montage

// INVITATIONS (via API, fallback localStorage)
const [invites, setInvites] = useState<Invite[]>([]);

// Charge depuis l’API au montage
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const res = await fetch("/api/invites/list", { method: "GET" });
      const data = await res.json();
      if (!cancelled && data?.ok) {
        setInvites(data.invites as Invite[]);
        return;
      }
      // fallback local
      const raw = localStorage.getItem("invites");
      setInvites(raw ? JSON.parse(raw) as Invite[] : []);
    } catch {
      const raw = localStorage.getItem("invites");
      setInvites(raw ? JSON.parse(raw) as Invite[] : []);
    }
  })();
  return () => { cancelled = true; };
}, []);


  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [msg, setMsg] = useState<{ ok?: true; err?: string } | null>(null);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// remplace TOUTE ta fonction inviteNow par ceci
async function inviteNow() {
  setMsg(null);

  // validations simples
  if (!firstName || !lastName || !isValidEmail(email)) {
    setMsg({ err: "Remplis prénom, nom et un email valide." });
    return;
  }

  try {
    // 1) envoi via l'API
    const res = await fetch("/api/invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        firstName,
        lastName,
        role: "Employé",
        storeCode: MANAGER_STORE.code || "UNKNOWN",
        storeName: MANAGER_STORE.name,
        hireDate: hireDate || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "Échec de l’envoi");
    }

    // 2) recharger la liste côté serveur (pas de loadInvites ici)
    try {
      const r2 = await fetch("/api/invites/list");
      const d2 = await r2.json();
      if (r2.ok && d2?.ok && Array.isArray(d2.invites)) {
        setInvites(d2.invites);
      }
    } catch {
      // silencieux: si l'API tombe, on ne casse pas l'UI
    }

    // 3) reset du formulaire + message OK
    setFirstName("");
    setLastName("");
    setEmail("");
    setHireDate("");
    setMsg({ ok: true });
  } catch (e: any) {
    setMsg({ err: e?.message || "Envoi impossible." });
  }
}


  const invitesForStore = invites.filter((inv) => !MANAGER_STORE.code || inv.storeCode === MANAGER_STORE.code);

  return (
    <div className="space-y-6">
      {!hydrated ? (
        <div className="min-h-[120px]" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Button variant="subtle" onClick={() => signOut({ callbackUrl: "/" })}>
              Déconnexion
            </Button>
            <div className="text-sm text-gray-600">
              Boutique : <b>{MANAGER_STORE.code || "—"}</b>
            </div>
          </div>

          {/* ÉQUIPE */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500">Équipe</div>
                <h2 className="text-xl font-bold">Employés de la boutique</h2>
              </div>
              <Button variant="subtle" onClick={exportCSV}>
                Exporter CSV
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees
                .filter((e) => !MANAGER_STORE.code || e.storeCode === MANAGER_STORE.code)
                .map((e) => {
                  const { pct, done, total } = computePct(e.progress);
                  const due = isDue(e);
                  return (
                    <div key={e.id} className="border rounded-2xl p-4 bg-white/90">
                      <div className="font-semibold">{fullName(e)}</div>
                      <div className="text-xs text-gray-500">
                        {e.storeCode} — Dernière activité : {daysSince(e.lastActive)} j
                      </div>

                      <div className="mt-3">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                          <span>Progression</span>
                          <span>
                            {pct}% ({done}/{total})
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button variant="ghost" onClick={() => setSelected(e)}>
                          Voir détails
                        </Button>
                        <Button variant="subtle" onClick={() => sendReminder(e, daysSince(e.lastActive))} disabled={!due}>
                          {due ? "Relancer" : "Relancé ✓"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* RECRUTEMENT / INVITATIONS */}
          <Card>
            <div className="text-sm text-gray-500">Recrutement</div>
            <h2 className="text-xl font-bold mb-3">Inviter un employé</h2>

            <div className="grid md:grid-cols-4 gap-3">
              <input
                placeholder="Prénom"
                className="border rounded-xl px-3 py-2"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                placeholder="Nom"
                className="border rounded-xl px-3 py-2"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <input
                placeholder="Email"
                className="border rounded-xl px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder="Date d’embauche (YYYY-MM-DD)"
                className="border rounded-xl px-3 py-2"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Button onClick={inviteNow}>Envoyer l’invitation</Button>
              <Button variant="subtle" onClick={() => setInvites([...invites])}>
                Actualiser
              </Button>
              <span className="text-xs text-gray-500">Validité 72 h (démo locale).</span>
            </div>

            {msg?.ok && <div className="mt-2 text-emerald-700 text-sm">Invitation créée (démo) ✓</div>}
            {msg?.err && <div className="mt-2 text-brand-700 text-sm">{msg.err}</div>}

            <div className="mt-6">
              <div className="text-sm font-semibold mb-2">Invitations en attente</div>
              {invitesForStore.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Aucune invitation en attente {MANAGER_STORE.code ? `pour ${MANAGER_STORE.code}` : ""}.
                </div>
              ) : (
                <div className="space-y-2">
                  {invitesForStore.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                      <div className="text-sm">
                        <b>
                          {inv.firstName} {inv.lastName}
                        </b>{" "}
                        — {inv.email} — {inv.storeCode}
                        <span
                          className={cn(
                            "ml-2 px-2 py-0.5 rounded-full text-xs",
                            inv.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : inv.status === "accepted"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">Invité le {new Date(inv.invitedAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Modal « Voir détails » */}
          {selected && (
            <div className="fixed inset-0 bg-black/30 grid place-items-center z-30">
              <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-lg">Détails — {fullName(selected)}</div>
                  <button className="text-gray-600" onClick={() => setSelected(null)}>
                    ✕
                  </button>
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Boutique {selected.storeCode} — Dernière activité : {daysSince(selected.lastActive)} j
                </div>
                <div className="space-y-2">
                  {chapterBreakdown(selected.progress).map((ch) => (
                    <div key={ch.no} className="border rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          Chapitre {ch.no} — {ch.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {ch.done}/{ch.total}
                        </div>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600" style={{ width: `${Math.round((ch.done / ch.total) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-right">
                  <Button variant="subtle" onClick={() => setSelected(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdminInvites({ onBack }: { onBack: () => void }) {
  // Types locaux (évite les conflits)
  type Role = "Employé" | "Gérant" | "Admin";
  type AdminInvite = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    storeCode: string;
    storeName?: string;
    hireDate?: string;
    status: "pending" | "revoked" | "accepted";
    invitedAt: string;
    acceptedAt?: string | null;
    revokedAt?: string | null;
    invitedByEmail?: string | null;
  };

  // --- État UI haut de page
  const EMP_KEY = "employees";
  const [emps, setEmps] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(EMP_KEY);
      setEmps(raw ? JSON.parse(raw) : []);
    } catch {
      setEmps([]);
    }
    const f = localStorage.getItem("adminStoreFilter");
    if (f) setSelectedStores(JSON.parse(f));
  }, []);

  function toggleStore(code: string) {
    setSelectedStores((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      localStorage.setItem("adminStoreFilter", JSON.stringify(next));
      return next;
    });
  }

  // --- Invitations (API + fallback localStorage)
  const [adminInvites, setAdminInvites] = useState<AdminInvite[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/invites/list");
        const data = await res.json();
        if (!cancelled && data?.ok) {
          setAdminInvites(data.invites as AdminInvite[]);
          return;
        }
        // Fallback localStorage si API KO
        const raw = localStorage.getItem("invites");
        setAdminInvites(raw ? (JSON.parse(raw) as AdminInvite[]) : []);
      } catch {
        const raw = localStorage.getItem("invites");
        setAdminInvites(raw ? (JSON.parse(raw) as AdminInvite[]) : []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshInvites() {
    try {
      const res = await fetch("/api/invites/list");
      const data = await res.json();
      if (data?.ok) {
        setAdminInvites(data.invites as AdminInvite[]);
        return;
      }
      const raw = localStorage.getItem("invites");
      setAdminInvites(raw ? JSON.parse(raw) : []);
    } catch {
      const raw = localStorage.getItem("invites");
      setAdminInvites(raw ? JSON.parse(raw) : []);
    }
  }

  // --- Formulaire d'envoi d'invitation
  const [invFirst, setInvFirst] = useState("");
  const [invLast, setInvLast] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<Role>("Employé");
  const [invStore, setInvStore] = useState<string>(STORES[0]?.code || "");
  const [invHireDate, setInvHireDate] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok?: true; err?: string } | null>(null);

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function sendInvite() {
    setInviteMsg(null);

    if (!invFirst || !invLast || !isValidEmail(invEmail) || !invStore) {
      setInviteMsg({ err: "Remplis prénom, nom, un email valide et la boutique." });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: invEmail,
          firstName: invFirst,
          lastName: invLast,
          role: invRole,
          storeCode: invStore,
          storeName: STORES.find((s) => s.code === invStore)?.name,
          hireDate: invHireDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Échec envoi");
      }

      setInviteMsg({ ok: true });
      setInvFirst("");
      setInvLast("");
      setInvEmail("");
      setInvHireDate("");

      // Recharge proprement via l’API
      await refreshInvites();
    } catch (e: any) {
      setInviteMsg({ err: e?.message || "Échec de l’envoi" });
    } finally {
      setSending(false);
    }
  }

  // --- Filtres
  const invFiltered = adminInvites.filter((inv) => {
    const passStore = selectedStores.length === 0 || selectedStores.includes(inv.storeCode);
    const q = search.trim().toLowerCase();
    const passText =
      !q || `${inv.firstName} ${inv.lastName} ${inv.email}`.toLowerCase().includes(q);
    return passStore && passText;
  });

  const filtered = emps.filter((e) => {
    const passStore = selectedStores.length === 0 || selectedStores.includes(e.storeCode);
    const q = search.trim().toLowerCase();
    const passText = !q || `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(q);
    return passStore && passText;
  });

  function countDone(p: Record<string, any>) {
    const total = CHAPTERS.reduce((n, ch) => n + ch.modules.length, 0);
    const done = Object.values(p || {}).filter((s: any) => s === "done").length;
    return Math.round((done / total) * 100);
  }

  return (
    <div className="space-y-6">
      <Button variant="subtle" onClick={() => signOut({ callbackUrl: "/" })}>
        Déconnexion
      </Button>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Bloc Invitations (Admin) */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Inviter un utilisateur</h2>

          <div className="grid grid-cols-2 gap-3">
            <input
              id="inv-first"
              name="firstName"
              placeholder="Prénom"
              className="border rounded-xl px-3 py-2"
              value={invFirst}
              onChange={(e) => setInvFirst(e.target.value)}
              autoComplete="given-name"
            />
            <input
              id="inv-last"
              name="lastName"
              placeholder="Nom"
              className="border rounded-xl px-3 py-2"
              value={invLast}
              onChange={(e) => setInvLast(e.target.value)}
              autoComplete="family-name"
            />
            <input
              id="inv-email"
              name="email"
              type="email"
              placeholder="Email"
              className="border rounded-xl px-3 py-2 col-span-2"
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              autoComplete="email"
            />

            <select
              id="inv-role"
              name="role"
              className="border rounded-xl px-3 py-2"
              value={invRole}
              onChange={(e) => setInvRole(e.target.value as Role)}
            >
              <option value="Employé">Employé</option>
              <option value="Gérant">Gérant</option>
              <option value="Admin">Admin</option>
            </select>

            <select
              id="inv-store"
              name="store"
              className="border rounded-xl px-3 py-2"
              value={invStore}
              onChange={(e) => setInvStore(e.target.value)}
            >
              {STORES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>

            <input
              id="inv-hire-date"
              name="hireDate"
              placeholder="Date d’embauche (YYYY-MM-DD)"
              className="border rounded-xl px-3 py-2 col-span-2"
              value={invHireDate}
              onChange={(e) => setInvHireDate(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={sendInvite} disabled={sending}>
              {sending ? "Envoi..." : "Envoyer l’invitation"}
            </Button>
            <Button variant="subtle" onClick={refreshInvites}>
              Actualiser
            </Button>
            <span className="text-xs text-gray-500">Liens d’invitation valides 72 h.</span>
          </div>

          {inviteMsg?.ok && <div className="mt-2 text-emerald-700 text-sm">Invitation envoyée ✓</div>}
          {inviteMsg?.err && <div className="mt-2 text-brand-700 text-sm">{inviteMsg.err}</div>}
        </Card>

        {/* Bloc Filtre & Liste employés */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Employés — Filtrer par boutiques</h2>

          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {STORES.map((s) => (
              <button
                key={s.code}
                onClick={() => toggleStore(s.code)}
                className={cn(
                  "px-3 py-1 rounded-full border text-sm",
                  selectedStores.includes(s.code)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white hover:bg-gray-50"
                )}
                title={s.name}
              >
                {s.code}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, email)"
            className="w-full border rounded-xl px-3 py-2 mb-4"
          />

          <div className="grid md:grid-cols-2 gap-3 max-h-[46vh] overflow-auto pr-1">
            {filtered.map((e) => {
              const pct = countDone(e.progress || {});
              return (
                <div key={e.id} className="border rounded-xl p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {e.firstName} {e.lastName}
                    </div>
                    <Pill color="bg-gray-100 text-gray-700">{e.storeCode}</Pill>
                  </div>
                  <div className="text-xs text-gray-500">{e.email}</div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600" style={{ width: pct + "%" }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Progression : {pct}%</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Bloc Invitations — Vue d’ensemble */}
        <Card className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Invitations — Vue d’ensemble</h2>

          <div className="mb-3 text-sm text-gray-600 flex items-center gap-3">
            <span>Filtrées par boutiques sélectionnées et recherche ci-dessus.</span>
            <Button variant="subtle" onClick={refreshInvites}>
              Actualiser
            </Button>
          </div>

          {invFiltered.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune invitation correspondant au filtre.</div>
          ) : (
            <div className="space-y-2 max-h-[46vh] overflow-auto pr-1">
              {invFiltered.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border rounded-xl px-3 py-2 bg-white">
                  <div className="text-sm">
                    <b>
                      {inv.firstName} {inv.lastName}
                    </b>{" "}
                    — {inv.email} — <span className="font-mono">{inv.storeCode}</span>
                    <span
                      className={cn(
                        "ml-2 px-2 py-0.5 rounded-full text-xs",
                        inv.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : inv.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {inv.status}
                    </span>
                    {inv.hireDate && (
                      <span className="ml-2 text-xs text-gray-500">— embauche {inv.hireDate}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-3">
                    <span>Invité le {new Date(inv.invitedAt).toLocaleDateString()}</span>
                    <Pill>{inv.role}</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-gray-600">
      © {new Date().getFullYear()} Académie Shop Santé — Aperçu interactif (démo).
    </div>
  );
}
