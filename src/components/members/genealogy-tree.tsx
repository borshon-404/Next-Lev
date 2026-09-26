"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Search, Users, CircleUser } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/format";

export interface TreeMember {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string | null;
  status: string;
  referralCode: string;
  depth: number;
  sponsorId: string | null;
  directReferralCount: number;
  joinedAt: string;
  walletAvailable?: number;
  rankName?: string | null;
  package?: string | null;
}

interface TreeNode extends TreeMember {
  children: TreeNode[];
}

function statusToneClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500";
    case "PENDING":
      return "bg-amber-400";
    case "SUSPENDED":
      return "bg-rose-500";
    default:
      return "bg-slate-300";
  }
}

export function GenealogyTree({
  self,
  members,
  depthLabel,
}: {
  self: TreeMember;
  members: TreeMember[];
  depthLabel: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TreeNode | null>(null);

  const { root, hiddenBySearch, searchHits } = useMemo(() => {
    const byId = new Map<string, TreeNode>();
    for (const m of members) {
      byId.set(m.id, { ...m, children: [] });
    }
    let root: TreeNode = { ...self, children: [] };
    for (const node of byId.values()) {
      const parent = node.sponsorId ? byId.get(node.sponsorId) : undefined;
      if (parent) parent.children.push(node);
      else root = node; // safety: orphan becomes root
    }
    const sortChildren = (n: TreeNode) => {
      n.children.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
      n.children.forEach(sortChildren);
    };
    sortChildren(root);

    const q = search.trim().toLowerCase();
    let hidden = 0;
    const hits: string[] = [];
    if (q) {
      const isHit = (n: TreeNode) => n.name.toLowerCase().includes(q) || n.username.toLowerCase().includes(q);
      const walk = (n: TreeNode, selfIsHit: boolean): boolean => {
        const childHit = n.children.map((c) => walk(c, selfIsHit || isHit(n))).some(Boolean);
        const show = selfIsHit || isHit(n) || childHit;
        if (!show) hidden++;
        else if (isHit(n)) hits.push(n.id);
        return show;
      };
      walk(root, false);
    }
    return { root, hiddenBySearch: hidden, searchHits: hits };
  }, [self, members, search]);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: TreeNode, level: number) => {
    const isCollapsed = collapsed.has(node.id);
    const isSelf = node.id === self.id;
    const hasChildren = node.children.length > 0;
    const highlighted = searchHits.includes(node.id);

    return (
      <div key={node.id} className="relative">
        {level > 0 && (
          <span className="absolute -left-3 top-1/2 h-px w-3 bg-slate-200" aria-hidden />
        )}
        <div
          className={[
            "relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
            isSelf
              ? "border-indigo-300 bg-indigo-50/70"
              : highlighted
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white hover:border-indigo-200",
          ].join(" ")}
        >
          {hasChildren ? (
            <button
              onClick={() => toggle(node.id)}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <button onClick={() => setSelected(node)} className="flex flex-1 items-center gap-2.5 text-left min-w-0">
            <span className="relative">
              <Avatar name={node.name} src={node.image} size="sm" />
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${statusToneClass(node.status)}`} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900">
                {node.name}
                {isSelf && <span className="ml-1.5 text-xs font-semibold text-indigo-600">(you)</span>}
              </span>
              <span className="block truncate text-xs text-slate-400">
                @{node.username} · L{node.depth - self.depth} · {node.directReferralCount} direct
              </span>
            </span>
          </button>
          {node.rankName && <Badge tone="purple" className="hidden sm:inline-flex">{node.rankName}</Badge>}
          <Badge tone={node.status === "ACTIVE" ? "success" : node.status === "SUSPENDED" ? "danger" : "default"} className="hidden md:inline-flex">
            {node.status}
          </Badge>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="ml-3 mt-1.5 space-y-1.5 border-l border-slate-200 pl-3">
            {node.children.map((c) => renderNode(c, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members in your tree…"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <CircleUser className="h-3.5 w-3.5" /> Click a member for details
        </span>
        {search && hiddenBySearch > 0 && (
          <span className="text-xs text-slate-400">{hiddenBySearch} members hidden by search</span>
        )}
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        {renderNode(root, 0)}
      </div>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : ""}
        description={selected ? `@${selected.username} · ${depthLabel} ${Math.max(0, selected.depth - self.depth)}` : undefined}
      >
        {selected && (
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Status</dt>
              <dd><Badge tone={selected.status === "ACTIVE" ? "success" : selected.status === "SUSPENDED" ? "danger" : "default"}>{selected.status}</Badge></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Email</dt>
              <dd className="font-medium text-slate-700">{selected.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Referral code</dt>
              <dd><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{selected.referralCode}</code></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Direct referrals</dt>
              <dd className="font-medium text-slate-700">{selected.directReferralCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Joined</dt>
              <dd className="font-medium text-slate-700">{formatDate(selected.joinedAt)}</dd>
            </div>
            {selected.rankName && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Rank</dt>
                <dd><Badge tone="purple">{selected.rankName}</Badge></dd>
              </div>
            )}
            {typeof selected.walletAvailable === "number" && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Available balance</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">{formatCurrency(selected.walletAvailable)}</dd>
              </div>
            )}
          </dl>
        )}
      </Dialog>
    </div>
  );
}
