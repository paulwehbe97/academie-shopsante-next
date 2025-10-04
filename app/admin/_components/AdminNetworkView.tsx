"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalUsers: number;
  avgCompletion: number;
  lateUsers: number;
};

export default function AdminNetworkView() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setStats(data.data);
      });
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-2xl shadow text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Employés */}
      <div className="p-6 bg-white rounded-2xl shadow text-center">
        <div className="text-sm text-gray-500 mb-1">Employés Réseau</div>
        <div className="text-3xl font-bold bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal bg-clip-text text-transparent">
          {stats.totalUsers}
        </div>
      </div>

      {/* Taux de complétion */}
      <div className="p-6 bg-white rounded-2xl shadow text-center">
        <div className="text-sm text-gray-500 mb-1">Taux de complétion</div>
        <div className="text-3xl font-bold bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal bg-clip-text text-transparent">
          {stats.avgCompletion}%
        </div>
      </div>

      {/* Cas en retard */}
      <div className="p-6 bg-white rounded-2xl shadow text-center">
        <div className="text-sm text-gray-500 mb-1">Cas en retard</div>
        <div className="text-3xl font-bold text-red-600">
          {stats.lateUsers}
        </div>
      </div>
    </div>
  );
}
