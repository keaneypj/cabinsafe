"use client";

import { useState, type ReactNode } from "react";
import { Minus, PackageCheck, Plus } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, Notice, ProgressBar, report, SectionHeader, type Tone } from "@/components/ui";
import { groupInventory, MAX_COUNT, parseCount, stockLevel, summarizeInventory, type StockLevel } from "@/domain/inventory";
import { can } from "@/domain/permissions";
import type { InventoryItem } from "@/domain/types";
import { fmtRelative } from "@/lib/format";
import { useCrewName, useNow } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

const LEVEL: Record<StockLevel, { label: string; tone: Tone }> = {
  full: { label: "Full", tone: "ok" },
  low: { label: "Low", tone: "warn" },
  out: { label: "Out", tone: "bad" },
};

/** Cabin catering inventory: what is on board against the usual stock, with quick logging. */
export function CabinInventory() {
  const items = useStore((s) => s.inventory);
  const setCount = useStore((s) => s.setInventoryCount);
  const fillToPar = useStore((s) => s.fillInventoryToPar);
  const me = useMe();
  const name = useCrewName();
  const now = useNow();
  const [confirmFill, setConfirmFill] = useState(false);
  const editable = can(me.role, "inventory.update");
  const sum = summarizeInventory(items);

  const fill = () => {
    setConfirmFill(false);
    const res = fillToPar();
    const changed = res.ok ? (res.value?.changed ?? 0) : 0;
    report(res, changed ? `Restocked ${changed} item${changed === 1 ? "" : "s"} to usual levels` : "Everything is already at its usual level");
  };

  return (
    <div className="space-y-4" data-testid="inventory">
      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[1.75rem] font-bold tnum text-ivory leading-none" data-testid="inventory-summary">
              {sum.full}
              <span className="text-slate-400 text-[1.125rem] font-semibold">/{sum.total}</span>
            </div>
            <div className="text-[0.8125rem] text-slate mt-1">items at usual stock</div>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {sum.low > 0 && <Badge tone="warn">{sum.low} low</Badge>}
            {sum.out > 0 && <Badge tone="bad">{sum.out} out</Badge>}
            {sum.low + sum.out === 0 && <Badge tone="ok">Fully stocked</Badge>}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={sum.total ? (sum.full / sum.total) * 100 : 0} tone={sum.out ? "bad" : sum.low ? "warn" : "ok"} label="Items at usual stock" />
        </div>
        {sum.lastUpdatedAt && (
          <p className="text-[0.75rem] text-slate-500 mt-2">
            Last logged {fmtRelative(sum.lastUpdatedAt, now)}
            {sum.lastUpdatedById ? ` by ${name(sum.lastUpdatedById)}` : ""}
          </p>
        )}
      </Card>

      {!editable && <Notice tone="info">Your demo role can view the inventory. Cabin attendants log what is on board.</Notice>}

      {sum.restock.length > 0 && (
        <section>
          <SectionHeader
            title="To restock"
            action={
              editable ? (
                <Button size="sm" variant="secondary" onClick={() => setConfirmFill(true)} data-testid="inventory-fill">
                  <PackageCheck className="size-4" aria-hidden /> Mark all restocked
                </Button>
              ) : undefined
            }
          />
          <ul className="card p-0 divide-y divide-[var(--separator)] overflow-hidden" data-testid="restock-list">
            {sum.restock.map(({ item, need }) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="text-ivory">{item.name}</span>
                <span className="tnum text-slate">
                  {need} needed · <span className="text-slate-500">{item.onBoard}/{item.par}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groupInventory(items).map((g) => (
        <section key={g.category}>
          <SectionHeader title={g.label} />
          <ul className="card p-0 divide-y divide-[var(--separator)] overflow-hidden">
            {g.items.map((item) => (
              <InventoryRow key={item.id} item={item} editable={editable} onSet={(n) => report(setCount(item.id, n))} />
            ))}
          </ul>
        </section>
      ))}

      <ConfirmDialog
        open={confirmFill}
        title="Mark all restocked?"
        body={<>This sets {sum.restock.map((r) => r.item.name).join(", ")} back to their usual levels. Use it after a full restock; adjust single items with + and −.</>}
        confirmLabel="Mark restocked"
        onConfirm={fill}
        onCancel={() => setConfirmFill(false)}
      />
    </div>
  );
}

function InventoryRow({ item, editable, onSet }: { item: InventoryItem; editable: boolean; onSet: (n: number) => void }) {
  const level = LEVEL[stockLevel(item)];
  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5 min-h-15" data-testid={`inv-${item.id}`}>
      <div className="flex-1 min-w-0">
        <div className="text-[0.9375rem] text-ivory truncate">{item.name}</div>
        <Badge tone={level.tone} className="mt-0.5">{level.label}</Badge>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StepButton label={`One fewer ${item.name}`} disabled={!editable || item.onBoard <= 0} onClick={() => onSet(item.onBoard - 1)} testId={`inv-minus-${item.id}`}>
          <Minus className="size-4" aria-hidden />
        </StepButton>
        <div className="flex items-baseline">
          {/* Re-keyed on the stored value so the field resets after any change. */}
          <CountInput key={item.onBoard} item={item} disabled={!editable} onCommit={onSet} />
          <span className="tnum text-[0.875rem] text-slate-500 w-7">/{item.par}</span>
        </div>
        <StepButton label={`One more ${item.name}`} disabled={!editable || item.onBoard >= MAX_COUNT} onClick={() => onSet(item.onBoard + 1)} testId={`inv-plus-${item.id}`}>
          <Plus className="size-4" aria-hidden />
        </StepButton>
      </div>
    </li>
  );
}

function StepButton({ label, disabled, onClick, testId, children }: { label: string; disabled: boolean; onClick: () => void; testId: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className="grid size-11 place-items-center rounded-full bg-navy-700 text-gold transition-opacity active:opacity-60 disabled:opacity-30 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function CountInput({ item, disabled, onCommit }: { item: InventoryItem; disabled: boolean; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(item.onBoard));
  const commit = () => {
    const n = parseCount(draft);
    if (n === null) {
      report({ ok: false, error: `Enter a whole number from 0 to ${MAX_COUNT}.` });
      setDraft(String(item.onBoard));
    } else if (n !== item.onBoard) onCommit(n);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={`${item.name} on board (usual ${item.par})`}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      data-testid={`inv-count-${item.id}`}
      className="w-9 min-h-11 rounded-lg bg-transparent text-right text-[1.0625rem] font-semibold tnum text-ivory outline-none focus:bg-navy-700 disabled:opacity-100"
    />
  );
}
