// components/ProgressBar.tsx
import React from 'react';

export type ProgressBarProps = {
  value: number;         // 0–100
  className?: string;
  height?: number;       // px
};

export function ProgressBar({ value, className = '', height = 10 }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return (
    <div
      className={`w-full rounded-full bg-gray-200 ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        className="h-full rounded-full bg-emerald-500 transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// 👇 rend disponible à la fois l’export nommé et l’export par défaut
export default ProgressBar;
