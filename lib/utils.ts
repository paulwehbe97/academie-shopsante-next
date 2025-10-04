export function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}
export function slugify(t: string) {
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
