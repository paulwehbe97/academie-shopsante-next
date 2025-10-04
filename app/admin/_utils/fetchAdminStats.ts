// app/admin/_utils/fetchAdminStats.ts
export async function fetchAdminStats() {
  try {
    const res = await fetch('/api/admin/stats')
    const json = await res.json()
    if (!json.ok) throw new Error('Erreur stats')
    return json.data
  } catch (err) {
    console.error('Erreur chargement stats admin:', err)
    return {
      totalEmployees: 0,
      level1: 0,
      level2: 0,
      inactive: 0,
    }
  }
}
