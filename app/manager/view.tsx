'use client';
import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { CHAPTERS } from '@/data/chapters';
import { STORES } from '@/data/stores';
import { cn } from '@/lib/utils';
import { moduleCode } from '@/lib/progress';
import CertsButton from './_components/CertsButton';
import RoleSwitch from '@/components/RoleSwitch';
import EmployeeActions from "@/components/EmployeeActions";

/* ---------- UI primitives ---------- */
function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white/90 rounded-2xl shadow-xl border border-gray-100 p-6', className)}>{children}</div>;
}

function Button(
  { children, onClick, variant = 'primary', className = '', disabled = false }:
  { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'subtle'; className?: string; disabled?: boolean }
) {
  const base = 'px-4 py-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white hover:opacity-95',
    ghost: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
    subtle: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  }[variant];
  return <button className={cn(base, styles, className)} onClick={onClick} disabled={disabled}>{children}</button>;
}

const GRADIENT = 'bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal';
function GradientBar({ pct, height = 8 }: { pct: number; height?: number }) {
  return (
    <div className="w-full rounded-full bg-gray-100">
      <div
        className="bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal rounded-full"
        style={{ width: `${pct}%`, height }}
      />
    </div>
  );
}


function RouteBeacon() {
  useEffect(() => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ui:route'));
  }, []);
  return null;
}

/* ---------- Types ---------- */
type ProgressState = 'not_started' | 'in_progress' | 'passed';
type ProgressMap = Record<string, ProgressState>;
type Employee = { id: string; firstName: string; lastName: string; email: string; storeCode: string; progress: ProgressMap; lastActive: string; lastReminderAt?: string; };
type Invite = { id: string; firstName: string; lastName: string; email: string; role: 'Employé'; storeCode: string; storeName: string; hireDate?: string; status: 'pending' | 'revoked' | 'accepted'; invitedAt: string; };
type ChapterStat = { chapterNo: number; title: string; completed: number; total: number; pct: number; lastActive?: string | null; };
type InviteSrv = {
  email: string;
  jti: string;
  role: 'Employé' | 'Gérant' | 'Admin';
  storeCode: string;
  storeName?: string;
  invitedBy?: string | null;
  invitedAt: string;
  revokedAt: string | null;
  acceptedAt: string | null;
  status: 'pending' | 'revoked' | 'accepted';
  expired: boolean;
  firstName?: string;
  lastName?: string;
  hireDate?: string | null;
};



/* ---------- Helpers ---------- */
function daysSince(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return isNaN(d) ? 0 : d;
}
function computeEmployeePct(p: ProgressMap) {
  const total = CHAPTERS.reduce((n, ch) => n + ch.modules.length, 0);
  let done = 0;
  for (const ch of CHAPTERS) {
    for (const m of ch.modules) {
      const code = moduleCode(ch.no, m);
      if (p[code] === 'passed') done++;
    }
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { pct, done, total };
}

/* ================================================================== */
/* PAGE GÉRANT */
/* ================================================================== */
export default function ManagerView() {
  const { data: session } = useSession();
  const storeCode = (session?.user as any)?.storeCode ?? 'QC01';
  const storeName = (session?.user as any)?.storeName ?? (STORES.find(s => s.code === storeCode)?.name || 'Boutique');

  /* EMPLOYÉS (depuis API) */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* KPIs */
  const [kpis, setKpis] = useState<{ total: number; avgPct: number; lagging: number; almost: number } | null>(null);

  /* Filtres & tri */
  type FilterKey = 'all' | 'lagging' | 'almost';
  type SortKey = 'progress' | 'inactivity' | 'name';
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('progress');
  function inactivityDays(e: Employee) { return daysSince(e.lastActive); }
  function progressPct(e: Employee) { return computeEmployeePct(e.progress).pct; }
  function applyFilter(list: Employee[]) {
    if (filter === 'all') return list;
    if (filter === 'lagging') return list.filter(e => inactivityDays(e) >= 10 && progressPct(e) < 100);
    return list.filter(e => progressPct(e) >= 80 && progressPct(e) < 100);
  }
  function applySort(list: Employee[]) {
    const arr = [...list];
    if (sortBy === 'progress') arr.sort((a, b) => progressPct(b) - progressPct(a));
    else if (sortBy === 'inactivity') arr.sort((a, b) => inactivityDays(b) - inactivityDays(a));
    else arr.sort((a, b) => (a.firstName + ' ' + a.lastName).localeCompare(b.firstName + ' ' + b.lastName));
    return arr;
  }
  const viewEmployees = applySort(applyFilter(employees));
  const fullName = (e: Employee) => `${e.firstName} ${e.lastName}`.trim();

  /* Invitations serveur */
  const [invitesSrv, setInvitesSrv] = useState<InviteSrv[] | null>(null);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [errInvites, setErrInvites] = useState<string | null>(null);

  /* Invitations localStorage */
  const [invites, setInvites] = useState<Invite[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('invites') : null;
      const list = raw ? (JSON.parse(raw) as Invite[]) : [];
      return list.filter(i => i.storeCode === storeCode);
    } catch { return []; }
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem('invites');
      const all = raw ? (JSON.parse(raw) as Invite[]) : [];
      const others = all.filter(i => i.storeCode !== storeCode);
      const next = [...others, ...invites];
      localStorage.setItem('invites', JSON.stringify(next));
    } catch {}
  }, [invites, storeCode]);

  /* Fetch équipe */
  async function reloadTeam() {
    try {
      setLoading(true);
      const res = await fetch('/api/manager/team?level=Niveau%201', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Server error');
      const teamRaw: any[] = data?.data?.team || [];
      const total = teamRaw.length;
      let sumPct = 0, lagging = 0, almost = 0;
      const list: Employee[] = teamRaw.map(u => {
        const name = (u.name || '').trim();
        const parts = name ? name.split(/\s+/) : [];
        const firstName = parts[0] || (u.email || '').split('@')[0];
        const lastName = parts.slice(1).join(' ');
        const pm: ProgressMap = {};
        CHAPTERS.forEach(ch => ch.modules.forEach(m => (pm[moduleCode(ch.no, m)] = 'not_started')));
        const allCodes = Object.keys(pm);
        const doneCount = Math.min(Number(u.progress?.done || 0), allCodes.length);
        for (let i = 0; i < doneCount; i++) pm[allCodes[i]] = 'passed';
        const pct = Number(u?.progress?.pct || 0);
        sumPct += pct;
        const lastActiveISO = u?.lastActive;
        const days = lastActiveISO ? Math.floor((Date.now() - new Date(lastActiveISO).getTime()) / 86_400_000) : 999;
        if (days >= 10 && pct < 100) lagging++;
        if (pct >= 80 && pct < 100) almost++;
        return { id: u.id, firstName, lastName, email: u.email, storeCode: u.storeCode || '', progress: pm, lastActive: u.lastActive || new Date(0).toISOString(), lastReminderAt: u.lastReminderAt || undefined };
      });
      const avgPct = total === 0 ? 0 : Math.round(sumPct / total);
      setKpis({ total, avgPct, lagging, almost });
      setEmployees(list);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  }

  /* Fetch invites */
  async function loadInvites() {
    try {
      setLoadingInvites(true);
      const res = await fetch('/api/invites/list', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Server error');
      setInvitesSrv(data.invites as InviteSrv[]);
      setErrInvites(null);
    } catch (e: any) {
      setErrInvites(e?.message || 'Erreur');
    } finally {
      setLoadingInvites(false);
    }
  }

  useEffect(() => { reloadTeam(); }, [storeCode]);
  useEffect(() => { loadInvites(); }, [storeCode]);

  /* Export CSV */
  function exportCSV() {
    const rows = [
      ['Nom', 'Email', 'Boutique', 'Progression (%)', 'Complétés/Total', 'Dernière activité (jours)'],
      ...viewEmployees.map(e => {
        const { pct, done, total } = computeEmployeePct(e.progress);
        return [fullName(e), e.email, e.storeCode, String(pct), `${done}/${total}`, String(daysSince(e.lastActive))];
      }),
    ];
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipe_${storeCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* Relance */
  async function sendReminder(e: Employee, daysInactive: number) {
    const { pct } = computeEmployeePct(e.progress);
    if (pct >= 100) return;
    try {
      const res = await fetch('/api/reminders/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: e.email, name: fullName(e), daysInactive, levelComplete: pct >= 100, storeCode, storeName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data as any)?.ok === false) throw new Error((data as any)?.error || 'Send failed');
      await reloadTeam();
    } catch (err) { console.warn('Reminder error', e.email, err); }
  }

  const isDue = (e: Employee) => daysSince(e.lastActive) >= 10 && (!e.lastReminderAt || daysSince(e.lastReminderAt) >= 10);

  /* Détails employé (modal) */
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [chapterStats, setChapterStats] = useState<ChapterStat[]>([]);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await fetch(`/api/manager/employee/${encodeURIComponent(selected.id)}/chapter-stats`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || 'Server error');
        if (!cancelled) { setChapterStats(data.data.chapters as ChapterStat[]); setDetailErr(null); }
      } catch (e: any) { if (!cancelled) setDetailErr(e?.message || 'Erreur serveur'); }
      finally { if (!cancelled) setLoadingDetail(false); }
    })();
    return () => { cancelled = true; };
  }, [selected]);

  /* Formulaire d’invitation */
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [msg, setMsg] = useState<{ ok?: true; err?: string } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal">
      <RouteBeacon />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Boutique : <b>{storeName} — ({storeCode})</b></div>
          <div className="flex items-center gap-3">
            <RoleSwitch role={(session?.user as any)?.role} />
            <button className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200" onClick={() => signOut({ callbackUrl: '/' })}>Déconnexion</button>
          </div>
        </div>

        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm"><div className="text-xs text-gray-500">Employés</div><div className="mt-1 text-2xl font-bold">{kpis.total}</div></div>
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm"><div className="text-xs text-gray-500">Moyenne progression (N1)</div><div className="mt-1 text-2xl font-bold">{kpis.avgPct}%</div></div>
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm"><div className="text-xs text-gray-500">À la traîne</div><div className="mt-1 text-2xl font-bold">{kpis.lagging}</div></div>
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm"><div className="text-xs text-gray-500">Presque fini</div><div className="mt-1 text-2xl font-bold">{kpis.almost}</div></div>
          </div>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div><div className="text-sm text-gray-500">Équipe</div><h2 className="text-xl font-bold">Employés de la boutique</h2></div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/70 border border-gray-200 rounded-xl px-1 py-1">
                <button className={`px-3 py-1.5 rounded-lg text-sm ${filter==='all'?'bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-black':'hover:bg-gray-100'}`} onClick={()=>setFilter('all')}>Tous</button>
                <button className={`px-3 py-1.5 rounded-lg text-sm ${filter==='lagging'?'bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-black':'hover:bg-gray-100'}`} onClick={()=>setFilter('lagging')} title="≥10 j & <100%">À la traîne</button>
                <button className={`px-3 py-1.5 rounded-lg text-sm ${filter==='almost'?'bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-black':'hover:bg-gray-100'}`} onClick={()=>setFilter('almost')} title="≥80%">Presque fini</button>
              </div>
              <select className="border border-gray-200 bg-white/90 rounded-xl px-3 py-1.5 text-sm" value={sortBy} onChange={e=>setSortBy(e.target.value as any)}>
                <option value="progress">Tri : Progression</option>
                <option value="inactivity">Tri : Inactivité</option>
                <option value="name">Tri : Nom</option>
              </select>
              <Button variant="subtle" onClick={exportCSV}>Exporter CSV</Button>
            </div>
          </div>

          {loading ? <div className="text-sm text-gray-600">Chargement…</div> :
          err ? <div className="text-sm text-red-600">Erreur : {err}</div> :
          employees.length === 0 ? <div className="text-sm text-gray-600">Aucun employé à afficher.</div> :
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {viewEmployees.map(e => {
              const { pct, done, total } = computeEmployeePct(e.progress);
              return (
                <div key={e.id} className="border rounded-2xl p-4 bg-white/90">
                  <div className="font-semibold">{e.firstName} {e.lastName}</div>
                  <div className="text-xs text-gray-500">{e.storeCode} — Dernière activité : {daysSince(e.lastActive)} j</div>
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal" style={{ width: `${pct}%` }} /></div>
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-600"><span>Progression</span><span>{pct}% ({done}/{total})</span></div>
                  </div>
                  <EmployeeActions employee={{ id: e.id, email: e.email, storeCode: e.storeCode, firstName: e.firstName, lastName: e.lastName }} variant="manager" onViewDetails={()=>setSelected(e)} />
                </div>
              );
            })}
          </div>}
        </Card>

        <Card>
          <div className="text-sm text-gray-500">Recrutement</div>
          <h2 className="text-xl font-bold mb-3">Inviter un employé</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <input placeholder="Prénom" className="border rounded-xl px-3 py-2" value={firstName} onChange={e=>setFirstName(e.target.value)} />
            <input placeholder="Nom" className="border rounded-xl px-3 py-2" value={lastName} onChange={e=>setLastName(e.target.value)} />
            <input placeholder="Email" className="border rounded-xl px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
            <input placeholder="Date d’embauche (YYYY-MM-DD)" className="border rounded-xl px-3 py-2" value={hireDate} onChange={e=>setHireDate(e.target.value)} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={()=>{
              setMsg(null);
              if(!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
                setMsg({err:'Remplis prénom, nom et un email valide.'});
                return;
              }
              const inv: Invite = {
                id: (typeof crypto!=='undefined' && 'randomUUID' in crypto)? crypto.randomUUID() : 'inv_'+Math.random().toString(36).slice(2,10),
                firstName, lastName, email, role: 'Employé', storeCode, storeName, hireDate: hireDate || undefined, status: 'pending', invitedAt: new Date().toISOString(),
              };
              fetch('/api/invites/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({to:email, firstName, lastName, role:'Employé', storeCode, storeName, hireDate: hireDate || undefined, inviteId: inv.id}) }).catch(()=>null);
              setInvites(v=>[inv, ...v]); setFirstName(''); setLastName(''); setEmail(''); setHireDate(''); setMsg({ok:true});
            }}>Envoyer l’invitation</Button>
            <Button variant="subtle" onClick={()=>setInvites([...invites])}>Actualiser</Button>
            <span className="text-xs text-gray-500">Validité 24 h.</span>
          </div>
          {msg?.ok && <div className="mt-2 text-emerald-700 text-sm">Invitation créée ✓</div>}
          {msg?.err && <div className="mt-2 text-brand-700 text-sm">{msg.err}</div>}
          <div className="mt-6">
            <div className="text-sm font-semibold mb-2">Invitations (serveur)</div>
            {loadingInvites ? <div className="text-sm text-gray-500">Chargement…</div> :
            errInvites ? <div className="text-sm text-red-600">Erreur : {errInvites}</div> :
            !invitesSrv || invitesSrv.length === 0 ? <div className="text-sm text-gray-500">Aucune invitation pour {storeCode}.</div> :
            <div className="space-y-2">
         {invitesSrv.map(inv => {
  let badgeClass = "bg-gray-200 text-gray-700";
  let badgeLabel: string = inv.status; // ✅ ajout du type explicite pour éviter l'erreur TS

  if (inv.status === "accepted") {
    badgeClass = "bg-emerald-100 text-emerald-700";
    badgeLabel = "Acceptée";
  } else if (inv.status === "pending" && !inv.expired) {
    badgeClass = "bg-blue-100 text-blue-700";
    badgeLabel = "En attente";
  } else if (inv.status === "pending" && inv.expired) {
    badgeClass = "bg-red-100 text-red-700";
    badgeLabel = "Expirée";
  } else if (inv.status === "revoked") {
    badgeClass = "bg-gray-300 text-gray-700";
    badgeLabel = "Révoquée";
  }

  return (
    <div key={inv.jti} className="flex items-center justify-between border rounded-xl px-3 py-2 bg-white">
      <div className="text-sm">
        <b>{inv.email}</b> — {inv.storeCode}
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${badgeClass}`}>{badgeLabel}</span>
        {inv.invitedBy && <span className="ml-2 text-xs text-gray-500">par {inv.invitedBy}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
          onClick={async () => {
            try {
              const res = await fetch("/api/invites/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: inv.email,
                  firstName: inv.firstName || "",
                  lastName: inv.lastName || "",
                  role: inv.role || "Employé",
                  storeCode: inv.storeCode,
                  storeName: inv.storeName || inv.storeCode,
                  inviteId: inv.jti,
                  hireDate: inv.hireDate || null,
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || data?.ok === false) throw new Error(data?.error || "Send failed");
              await loadInvites();
            } catch (e) {
              console.warn("Resend failed", e);
            }
          }}
          disabled={inv.status === "accepted"}
          title={inv.status === "accepted" ? "Déjà accepté" : "Renvoyer l’invitation"}
        >
          Renvoyer
        </button>
        <div className="text-xs text-gray-500">Invité le {new Date(inv.invitedAt).toLocaleDateString()}</div>
      </div>
    </div>
  );
})}

            </div>}
          </div>
        </Card>

        {selected && (
          <div className="fixed inset-0 bg-black/30 grid place-items-center z-30">
            <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">Détails — {selected.firstName} {selected.lastName}</div>
                <div className="flex items-center gap-2">
                  <CertsButton email={selected.email} />
                  <button className="text-gray-600" onClick={()=>setSelected(null)}>✕</button>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-4">Boutique {selected.storeCode} — Dernière activité : {daysSince(selected.lastActive)} j</div>
              {loadingDetail ? <div className="text-sm text-gray-600">Chargement des chapitres…</div> :
              detailErr ? <div className="text-sm text-red-600">Erreur : {detailErr}</div> :
              <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                {chapterStats.map(ch => (
                  <div key={ch.chapterNo} className="border rounded-xl p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Chapitre {ch.chapterNo} — {ch.title}</div>
                      <div className="text-sm text-gray-600">{ch.completed}/{ch.total}</div>
                    </div>
                    <div className="mt-2"><GradientBar pct={ch.pct ?? 0} height={8} /></div>
                    {ch.lastActive && <div className="mt-1 text-xs text-gray-500">Dernière activité : {daysSince(ch.lastActive)} j</div>}
                  </div>
                ))}
              </div>}
              <div className="mt-4 text-right"><Button variant="subtle" onClick={()=>setSelected(null)}>Fermer</Button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
