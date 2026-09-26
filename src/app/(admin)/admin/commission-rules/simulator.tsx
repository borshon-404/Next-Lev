"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

export interface SimRule {
  level: number;
  percentage: number;
  active: boolean;
}

/**
 * Commission simulator (admin-only preview).
 * Pure front-end calculation over the configured rules — it never creates
 * transactions, commissions or ledger entries.
 */
export function Simulator({ rules, currency }: { rules: SimRule[]; currency: string }) {
  const [amount, setAmount] = useState("100");
  const active = rules.filter((r) => r.active);

  const rows = useMemo(() => {
    const base = parseFloat(amount) || 0;
    return active
      .map((r) => ({
        level: r.level,
        percentage: r.percentage,
        amount: Math.round(base * r.percentage) / 100,
      }))
      .sort((a, b) => a.level - b.level);
  }, [amount, active]);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Hypothetical purchase amount</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-11 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        <p className="mt-2 text-xs text-slate-400">
          This is a calculation preview only — no orders, commissions or ledger entries are created.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Calculator className="h-4 w-4 text-indigo-500" /> Distribution preview
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No active commission levels.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.level} className="flex items-center justify-between rounded-lg bg-white px-3.5 py-2.5 shadow-sm">
                <span className="text-slate-600">
                  Level {r.level} <span className="text-slate-400">· {r.percentage}%</span>
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {currency} {r.amount.toFixed(2)}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between rounded-lg bg-indigo-600 px-3.5 py-2.5 text-white">
              <span className="font-medium">Total payout</span>
              <span className="font-bold tabular-nums">{currency} {total.toFixed(2)}</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
