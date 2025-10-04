export type ProgressRow = {
  moduleCode: string;
  levelKey: string;
  chapterId: string;
  watched: boolean;
  attempts: number;
  pct: number;              // 0..100
  lastAttemptAt?: string;   // ISO string
};

export async function fetchProgressServer(): Promise<Record<string, Omit<ProgressRow,"moduleCode">>> {
  const res = await fetch("/api/progress", { method: "GET", headers: { "Cache-Control": "no-store" } });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) return {};
  return data.data || {};
}

export async function upsertProgressServer(rows: ProgressRow | ProgressRow[]) {
  const payload = Array.isArray(rows) ? rows : [rows];
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Progress update failed");
  return data.data as Record<string, { pct: number; watched: boolean; attempts: number; updatedAt: string }>;
}
