"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronRight, Minus, PackageCheck, PackagePlus, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Notice, ProgressBar, report, SectionHeader, Sheet, type Tone } from "@/components/ui";
import { CATEGORY_LABELS, CATEGORY_ORDER, groupInventory, MAX_COUNT, parseCount, stockLevel, summarizeInventory, type StockLevel } from "@/domain/inventory";
import { can } from "@/domain/permissions";
import type { InventoryCategory, InventoryItem } from "@/domain/types";
import { fmtRelative } from "@/lib/format";
import { useCrewName, useNow } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

const LEVEL: Record<StockLevel, { label: string; tone: Tone }> = {
  full: { label: "Full", tone: "ok" },
  low: { label: "Low", tone: "warn" },
  out: { label: "Out", tone: "bad" },
};

/** Which item the add/edit sheet is showing: a new one, or an existing item's id. */
type SheetTarget = { mode: "add" } | { mode: "edit"; id: string };

/** Cabin catering inventory: what is on board against the usual stock, with quick logging. */
export function CabinInventory() {
  const items = useStore((s) => s.inventory);
  const setCount = useStore((s) => s.setInventoryCount);
  const fillToPar = useStore((s) => s.fillInventoryToPar);
  const me = useMe();
  const name = useCrewName();
  const now = useNow();
  const [confirmFill, setConfirmFill] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  // Stable so the open sheet doesn't re-run its focus handling when the clock ticks.
  const closeSheet = useCallback(() => setSheet(null), []);
  const canLog = can(me.role, "inventory.update");
  const canManage = can(me.role, "inventory.manage");
  const isEditing = editing && canManage;
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
            {sum.total > 0 && sum.low + sum.out === 0 && <Badge tone="ok">Fully stocked</Badge>}
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

      {!canLog && <Notice tone="info">Your demo role can view the inventory. Cabin attendants log what is on board.</Notice>}

      {!isEditing && sum.restock.length > 0 && (
        <section>
          <SectionHeader
            title="To restock"
            action={
              canLog ? (
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

      {canManage && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[0.8125rem] text-slate">{isEditing ? "Tap an item to rename it, change its usual amount or remove it." : "Stock list"}</p>
          <Button size="sm" variant={isEditing ? "primary" : "ghost"} onClick={() => setEditing(!isEditing)} data-testid="inventory-edit">
            {isEditing ? "Done" : "Edit list"}
          </Button>
        </div>
      )}

      {items.length === 0 && (
        <EmptyState icon={<PackagePlus className="size-7" />} title="No stock items yet">
          {canManage ? "Add the items usually stocked on board." : "The Lead Cabin Attendant sets up the stock list."}
        </EmptyState>
      )}

      {groupInventory(items).map((g) => (
        <section key={g.category}>
          <SectionHeader title={g.label} />
          <ul className="card p-0 divide-y divide-[var(--separator)] overflow-hidden">
            {g.items.map((item) =>
              isEditing ? (
                <EditRow key={item.id} item={item} onOpen={() => setSheet({ mode: "edit", id: item.id })} />
              ) : (
                <InventoryRow key={item.id} item={item} editable={canLog} onSet={(n) => report(setCount(item.id, n))} />
              ),
            )}
          </ul>
        </section>
      ))}

      {isEditing && (
        <Button variant="secondary" className="w-full" onClick={() => setSheet({ mode: "add" })} data-testid="inventory-add">
          <PackagePlus className="size-4" aria-hidden /> Add item
        </Button>
      )}

      {sheet && <ItemSheet key={sheet.mode === "edit" ? sheet.id : "new"} target={sheet} onClose={closeSheet} />}

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

function EditRow({ item, onOpen }: { item: InventoryItem; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 px-3.5 py-2.5 min-h-15 text-left hover:bg-navy-700/30" data-testid={`inv-edit-${item.id}`}>
        <span className="flex-1 min-w-0">
          <span className="block text-[0.9375rem] text-ivory truncate">{item.name}</span>
          <span className="block text-xs text-slate">Usual amount {item.par}</span>
        </span>
        <ChevronRight className="size-4 text-slate-500" aria-hidden />
      </button>
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

/** Add a stock item, or edit an existing one's name, category and usual amount. */
function ItemSheet({ target, onClose }: { target: SheetTarget; onClose: () => void }) {
  const items = useStore((s) => s.inventory);
  const add = useStore((s) => s.addInventoryItem);
  const update = useStore((s) => s.updateInventoryItem);
  const remove = useStore((s) => s.removeInventoryItem);
  const existing = target.mode === "edit" ? items.find((i) => i.id === target.id) : undefined;
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    category: existing?.category ?? ("other" as InventoryCategory),
    par: String(existing?.par ?? ""),
    onBoard: "0",
  });
  const [error, setError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const numeric = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 2);

  if (target.mode === "edit" && !existing) return null;

  const save = () => {
    const res = existing ? update(existing.id, form) : add(form);
    if (!res.ok) return setError(res.error);
    report(res, existing ? `Saved ${form.name.trim()}` : `Added ${form.name.trim()}`);
    onClose();
  };
  const doRemove = () => {
    if (!existing) return;
    if (report(remove(existing.id), `Removed ${existing.name}`)) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : "Add stock item"}
      subtitle={existing ? `${existing.onBoard} on board now` : "Something usually stocked on board"}
      footer={
        confirmRemove ? (
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmRemove(false)}>
              Keep it
            </Button>
            <Button variant="danger" className="flex-1" onClick={doRemove} data-testid="inv-remove-confirm">
              Remove
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save} data-testid="inv-save">
              {existing ? "Save" : "Add item"}
            </Button>
          </>
        )
      }
    >
      {confirmRemove && existing ? (
        <p className="text-sm text-slate leading-relaxed">Remove {existing.name} from the stock list? Its count ({existing.onBoard}/{existing.par}) is removed too. The audit history keeps a record.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field label="Name" htmlFor="inv-name">
            <input id="inv-name" className="field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sparkling water" maxLength={40} autoComplete="off" />
          </Field>
          <Field label="Category" htmlFor="inv-category">
            <select id="inv-category" className="field" value={form.category} onChange={(e) => set("category", e.target.value as InventoryCategory)}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Usual amount" htmlFor="inv-par" hint="Full stock level">
              <input id="inv-par" className="field tnum" inputMode="numeric" pattern="[0-9]*" value={form.par} onChange={(e) => set("par", numeric(e.target.value))} placeholder="5" />
            </Field>
            {!existing && (
              <Field label="On board now" htmlFor="inv-onboard">
                <input id="inv-onboard" className="field tnum" inputMode="numeric" pattern="[0-9]*" value={form.onBoard} onChange={(e) => set("onBoard", numeric(e.target.value))} onFocus={(e) => e.target.select()} />
              </Field>
            )}
          </div>
          {error && (
            <p className="text-xs text-bad -mt-1 mb-2" role="alert">
              {error}
            </p>
          )}
          {/* Lets Enter submit from any field. */}
          <button type="submit" hidden />
          {existing && (
            <Button type="button" variant="danger" size="sm" className="mt-2" onClick={() => setConfirmRemove(true)} data-testid="inv-remove">
              <Trash2 className="size-4" aria-hidden /> Remove from list
            </Button>
          )}
        </form>
      )}
    </Sheet>
  );
}
