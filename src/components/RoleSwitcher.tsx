"use client";

import { useState } from "react";
import { Check, Eye } from "lucide-react";
import { ROLE_LABELS, permissionsFor } from "@/domain/permissions";
import { useMe, useStore } from "@/store/store";
import { cx } from "@/lib/format";
import { Avatar, Notice, Sheet, toast } from "./ui";

export function RoleChip() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-slate/15 bg-navy/70 pl-1 pr-3 py-1 min-h-10 hover:border-gold/40 transition-colors"
        aria-label={`Demo Role Preview: viewing as ${me.name}, ${me.title}. Change role`}
        data-testid="role-chip"
      >
        <Avatar initials={me.initials} size={30} tone={me.role === "lead" ? "gold" : "navy"} />
        <span className="text-left leading-tight hidden min-[380px]:block">
          <span className="block text-[0.5625rem] uppercase tracking-[0.14em] text-gold/80">Demo Role Preview</span>
          <span className="block text-xs text-ivory font-medium max-w-[8.5rem] truncate">{me.name.replace("Capt. ", "").replace("F/O ", "")}</span>
        </span>
      </button>
      <RoleSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function RoleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const crew = useStore((s) => s.crew);
  const current = useStore((s) => s.currentUserId);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  return (
    <Sheet open={open} onClose={onClose} title="Demo Role Preview" subtitle="Preview the app as another crew member">
      <Notice tone="warn" className="mb-4">
        Client-side role preview for demonstration only. This is <strong>not authentication or security enforcement</strong>. In production, permissions are enforced server-side with authenticated accounts and database row-level security.
      </Notice>
      <ul className="space-y-2">
        {crew.map((c) => {
          const active = c.id === current;
          const perms = permissionsFor(c.role);
          return (
            <li key={c.id}>
              <button
                onClick={() => {
                  setCurrentUser(c.id);
                  toast.info(`Now previewing as ${c.name} · ${c.title}`);
                  onClose();
                }}
                className={cx("w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors min-h-16", active ? "border-gold/60 bg-gold/8" : "border-slate/12 bg-midnight-900/30 hover:border-slate/30")}
                data-testid={`role-${c.id}`}
              >
                <Avatar initials={c.initials} tone={c.role === "lead" ? "gold" : "navy"} size={40} />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-ivory">{c.name}</span>
                  <span className="block text-xs text-slate">
                    {c.title} · {ROLE_LABELS[c.role]}
                  </span>
                  <span className="block text-[0.6875rem] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Eye className="size-3" aria-hidden />
                    {perms.includes("medical.view") ? "Full access incl. restricted medical" : perms.includes("equipment.inspect") ? "Own tasks, inspections, handovers · no medical detail" : perms.includes("briefing.generate") ? "Readiness, advisories, briefings · no medical detail" : "Own tasks · no medical detail"}
                  </span>
                </span>
                {active && <Check className="size-5 text-gold" aria-label="Current role" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
