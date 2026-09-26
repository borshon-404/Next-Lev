"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { saveMlmSettingsAction, type AdminActionResult } from "@/server/admin/actions";

interface RuleRow {
  key: number;
  level: number;
  percentage: string;
  active: boolean;
  description: string;
}

export function RulesForm({
  initial,
}: {
  initial: {
    commissionEnabled: boolean;
    commissionAutoApprove: boolean;
    rules: { level: number; percentage: number; active: boolean; description: string }[];
  };
}) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(saveMlmSettingsAction, {});
  const [rows, setRows] = useState<RuleRow[]>(
    initial.rules.map((r, i) => ({ key: i + 1, level: r.level, percentage: String(r.percentage), active: r.active, description: r.description }))
  );
  const [engineOn, setEngineOn] = useState(initial.commissionEnabled);
  const [autoApprove, setAutoApprove] = useState(initial.commissionAutoApprove);

  const update = (key: number, patch: Partial<RuleRow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const add = () => {
    setRows((rs) => {
      const nextLevel = rs.length ? Math.max(...rs.map((r) => r.level)) + 1 : 1;
      return [...rs, { key: Date.now(), level: nextLevel, percentage: "0", active: true, description: "" }];
    });
  };
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

  const buildPayload = () =>
    JSON.stringify({
      commissionEnabled: engineOn,
      commissionAutoApprove: autoApprove,
      rules: rows.map((r) => ({ level: r.level, percentage: parseFloat(r.percentage) || 0, active: r.active, description: r.description || undefined })),
    });

  return (
    <form action={formAction} className="px-5 pb-5">
      {state.error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}
      {state.info && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.info}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-6">
        <Checkbox checked={engineOn} onCheckedChange={(v) => setEngineOn(v === true)} label="Commission engine enabled" />
        <Checkbox checked={autoApprove} onCheckedChange={(v) => setAutoApprove(v === true)} label="Auto-approve commissions (credit available balance immediately)" />
      </div>

      <div className="space-y-2.5">
        <div className="grid grid-cols-[64px_110px_1fr_70px_44px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>Level</span>
          <span>Percentage</span>
          <span>Description</span>
          <span>Active</span>
          <span />
        </div>
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[64px_110px_1fr_70px_44px] items-center gap-2">
            <Input
              type="number"
              min="1"
              value={r.level}
              onChange={(e) => update(r.key, { level: parseInt(e.target.value) || 1 })}
              className="h-9"
              aria-label="Level"
            />
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={r.percentage}
                onChange={(e) => update(r.key, { percentage: e.target.value })}
                className="h-9 pr-7"
                aria-label="Percentage"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
            <Input
              value={r.description}
              onChange={(e) => update(r.key, { description: e.target.value })}
              placeholder="e.g. Direct sponsor"
              className="h-9"
              aria-label="Description"
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={r.active}
                onChange={(e) => update(r.key, { active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40"
                aria-label="Active"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(r.key)}
              className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
              aria-label="Remove level"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add level
        </Button>
        <div className="flex items-center gap-3">
          <input type="hidden" name="payload" value={buildPayload()} />
          <Button type="submit" loading={pending}>
            Save commission rules
          </Button>
        </div>
      </div>
    </form>
  );
}
