// lib/local.ts
// Mini “DAL” localStorage pour la démo (sans backend)

export type Role = 'Employé' | 'Gérant' | 'Admin';

export type Store = { code: string; name: string };

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  storeCode: string;
  hireDate: string;   // YYYY-MM-DD
  active: boolean;
};

export type Invite = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  storeCode: string;
  hiredAt: string;      // YYYY-MM-DD
  status: 'pending' | 'revoked' | 'accepted';
  invitedAt: string;    // ISO
  expiresAt: number;    // epoch ms
};

export type Session = {
  role: Role;
  storeCode?: string; // gérant
  email?: string;
};

const K = {
  stores: 'ss.stores',
  users: 'ss.users',
  invites: 'ss.invites',
  session: 'ss.session',
};

const now = () => new Date().toISOString();
const id = () => Math.random().toString(36).slice(2, 10);

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(val));
}

function seed() {
  const stores: Store[] = read(K.stores, []);
  if (stores.length) return;

  const seedStores: Store[] = [
    { code: 'QC01', name: 'Québec Sainte-Foy' },
    { code: 'MTL01', name: 'Montréal Centre' },
  ];
  const seedUsers: User[] = [
    { id: id(), firstName: 'Alex',  lastName: 'Fortin',   email: 'alex@shop.ca',  role: 'Employé', storeCode: 'QC01',  hireDate: '2024-03-12', active: true },
    { id: id(), firstName: 'Marie', lastName: 'Tremblay', email: 'marie@shop.ca', role: 'Employé', storeCode: 'QC01',  hireDate: '2023-11-08', active: true },
    { id: id(), firstName: 'Samir', lastName: 'Benali',   email: 'samir@shop.ca', role: 'Employé', storeCode: 'MTL01', hireDate: '2024-01-21', active: true },
    // Un gérant par boutique (exemple)
    { id: id(), firstName: 'Julie', lastName: 'Gagnon',   email: 'gerant-qc01@shop.ca', role: 'Gérant', storeCode: 'QC01',  hireDate: '2022-05-01', active: true },
    { id: id(), firstName: 'Paul',  lastName: 'Wehbe',    email: 'admin@shopsante.ca',  role: 'Admin',  storeCode: 'QC01',  hireDate: '2020-09-10', active: true },
  ];

  write(K.stores, seedStores);
  write(K.users, seedUsers);
  write(K.invites, [] as Invite[]);
}

export const storage = {
  ensureSeed: seed,

  // Stores
  getStores(): Store[] {
    return read<Store[]>(K.stores, []);
  },

  // Users
  getAllUsers(): User[] {
    return read<User[]>(K.users, []);
  },
  getUsersByStore(storeCode: string): User[] {
    return this.getAllUsers().filter(u => u.storeCode === storeCode);
  },
  upsertUser(u: User) {
    const items = this.getAllUsers();
    const i = items.findIndex(x => x.id === u.id);
    if (i >= 0) items[i] = u; else items.push(u);
    write(K.users, items);
  },
  removeUser(idToRemove: string) {
    write(K.users, this.getAllUsers().filter(u => u.id !== idToRemove));
  },

  // Invites
  getAllInvites(): Invite[] {
    return read<Invite[]>(K.invites, []);
  },
  getInvitesByStore(storeCode?: string): Invite[] {
    const arr = this.getAllInvites();
    return storeCode ? arr.filter(i => i.storeCode === storeCode && i.status === 'pending') : arr.filter(i => i.status === 'pending');
  },
  createInvite(p: { firstName: string; lastName: string; email: string; hiredAt: string; storeCode: string }): Invite {
    const inv: Invite = {
      id: id(),
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      email: p.email.trim(),
      storeCode: p.storeCode,
      hiredAt: p.hiredAt,
      status: 'pending',
      invitedAt: now(),
      expiresAt: Date.now() + 72 * 60 * 60 * 1000,
    };
    const arr = this.getAllInvites();
    arr.push(inv);
    write(K.invites, arr);
    return inv;
  },
  revokeInvite(inviteId: string) {
    const arr = this.getAllInvites();
    const i = arr.find(x => x.id === inviteId);
    if (i) i.status = 'revoked';
    write(K.invites, arr);
  },
  resendInvite(inviteId: string) {
    const arr = this.getAllInvites();
    const i = arr.find(x => x.id === inviteId);
    if (i && i.status === 'pending') i.expiresAt = Date.now() + 72 * 60 * 60 * 1000;
    write(K.invites, arr);
  },
  acceptInvite(inviteId: string) {
    const arr = this.getAllInvites();
    const i = arr.find(x => x.id === inviteId);
    if (!i) return;
    i.status = 'accepted';
    write(K.invites, arr);
    const u: User = {
      id: id(),
      firstName: i.firstName,
      lastName: i.lastName,
      email: i.email,
      role: 'Employé',
      storeCode: i.storeCode,
      hireDate: i.hiredAt,
      active: true,
    };
    this.upsertUser(u);
  },

  // Session (démo)
  getSession(): Session | null {
    return read<Session | null>(K.session, null);
  },
  setSession(s: Session | null) {
    if (s) write(K.session, s); else localStorage.removeItem(K.session);
  },
};

// --- UI State (route / role / currentModule / progress) --------------------
// Permet de persister l'UI même après refresh, sans toucher à tes autres données.

type UIProgressState = 'todo' | 'in_progress' | 'done';
type UIState = {
  route?: 'login' | 'employee' | 'module' | 'quiz' | 'manager' | 'admin';
  role?: Role;
  currentModule?: { chapter: number; title: string };
  progress?: Record<string, { status: UIProgressState; score?: number }>;
};

const UI_KEY = (email?: string) => `ss.ui.v1:${email ?? 'demo'}`;

export function loadUIState(email?: string): UIState {
  return read<UIState>(UI_KEY(email), {});
}

export function saveUIState(partial: UIState, email?: string) {
  const prev = loadUIState(email);
  write(UI_KEY(email), { ...prev, ...partial });
}
