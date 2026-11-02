"use client";

import { useCallback, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, Field, Notice, PageTitle, report, Sheet } from "@/components/ui";
import { can } from "@/domain/permissions";
import { PREFERENCE_CATEGORIES, PREFERENCE_MAX, RELATION_LABELS } from "@/domain/preferences";
import type { PreferenceCategory, PreferencePerson } from "@/domain/types";
import { cx } from "@/lib/format";
import { useMe, useStore } from "@/store/store";

type Relation = Exclude<PreferencePerson["relation"], "principal">;
type PrefTarget = { personId: string; category: PreferenceCategory; prefId?: string };
type PersonTarget = { personId?: string };

export default function PreferencesPage() {
  const me = useMe();
  const people = useStore((s) => s.preferences);
  const canEdit = can(me.role, "preferences.manage");
  const [pref, setPref] = useState<PrefTarget | null>(null);
  const [person, setPerson] = useState<PersonTarget | null>(null);
  const closePref = useCallback(() => setPref(null), []);
  const closePerson = useCallback(() => setPerson(null), []);
  const principal = people.find((p) => p.relation === "principal");
  const others = people.filter((p) => p.relation !== "principal");

  return (
    <div className="space-y-6">
      <PageTitle title="Preferences" subtitle="What the principal and regular passengers like, so every flight feels the same" />
      {!canEdit && <Notice tone="info">Your demo role can view preferences. Cabin attendants and the Principal&apos;s PA keep them up to date.</Notice>}

      {principal && (
        <section data-testid="pref-principal">
          <h2 className="eyebrow px-1 mb-2">Principal</h2>
          <PersonCard person={principal} canEdit={canEdit} defaultOpen onAdd={(category) => setPref({ personId: principal.id, category })} onEditPref={(category, prefId) => setPref({ personId: principal.id, category, prefId })} onEditPerson={() => setPerson({ personId: principal.id })} />
        </section>
      )}

      <section data-testid="pref-frequent">
        <div className="flex items-end justify-between px-1 mb-2">
          <h2 className="eyebrow">Frequent Passengers</h2>
          <span className="text-[0.75rem] text-slate-500 tnum">{others.length}</span>
        </div>
        <div className="space-y-2.5">
          {others.map((p) => (
            <PersonCard key={p.id} person={p} canEdit={canEdit} onAdd={(category) => setPref({ personId: p.id, category })} onEditPref={(category, prefId) => setPref({ personId: p.id, category, prefId })} onEditPerson={() => setPerson({ personId: p.id })} />
          ))}
          {others.length === 0 && <p className="px-1 text-[0.9375rem] text-slate-400">No frequent passengers yet.</p>}
        </div>
        {canEdit && (
          <Button size="lg" className="mt-3 w-full" onClick={() => setPerson({})} data-testid="pref-add-person">
            <UserPlus className="size-5" aria-hidden /> Add Person
          </Button>
        )}
      </section>

      <p className="text-[0.75rem] text-slate-500 text-center px-4">Placeholder names and examples. Replace them with the real details. Saved on this device.</p>

      {pref && <PreferenceSheet key={`${pref.personId}-${pref.category}-${pref.prefId ?? "new"}`} target={pref} onClose={closePref} />}
      {person && <PersonSheet key={person.personId ?? "new"} target={person} onClose={closePerson} />}
    </div>
  );
}

function PersonCard({ person, canEdit, defaultOpen, onAdd, onEditPref, onEditPerson }: { person: PreferencePerson; canEdit: boolean; defaultOpen?: boolean; onAdd: (c: PreferenceCategory) => void; onEditPref: (c: PreferenceCategory, prefId: string) => void; onEditPerson: () => void }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="p-0 overflow-hidden" data-testid={`pref-person-${person.id}`}>
      <div className="flex items-center">
        <button className="flex flex-1 min-w-0 min-h-14 items-center gap-2.5 px-4 text-left" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={`pref-toggle-${person.id}`}>
          <span className="flex-1 min-w-0">
            <span className="block text-[1.0625rem] font-semibold text-ivory truncate">{person.name}</span>
            <span className="block text-[0.75rem] text-slate-400">
              {RELATION_LABELS[person.relation]} · {person.preferences.length} preference{person.preferences.length === 1 ? "" : "s"}
            </span>
          </span>
          <ChevronDown className={cx("size-5 text-slate-500 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {canEdit && (
          <button className="grid size-12 shrink-0 place-items-center text-slate-400 hover:text-ivory" onClick={onEditPerson} aria-label={`Edit ${person.name}`} data-testid={`pref-edit-person-${person.id}`}>
            <Pencil className="size-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="border-t hairline divide-y divide-[var(--separator)]">
          {PREFERENCE_CATEGORIES.map((c) => {
            const items = person.preferences.filter((x) => x.category === c.key);
            return (
              <div key={c.key} className="px-4 py-3" data-testid={`pref-cat-${person.id}-${c.key}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className={cx("text-[0.8125rem] font-semibold", c.key === "avoid" ? "text-warn" : "text-gold")}>{c.label}</h3>
                  {canEdit && (
                    <button className="inline-flex min-h-9 items-center gap-1 px-1 text-[0.8125rem] font-medium text-gold" onClick={() => onAdd(c.key)} aria-label={`Add ${c.label} preference for ${person.name}`} data-testid={`pref-add-${person.id}-${c.key}`}>
                      <Plus className="size-4" aria-hidden /> Add
                    </button>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="text-[0.875rem] text-slate-500">Nothing noted</p>
                ) : (
                  <ul className="mt-0.5 space-y-0.5">
                    {items.map((x) => (
                      <li key={x.id}>
                        {canEdit ? (
                          <button className="w-full min-h-9 rounded-lg py-1 text-left text-[0.9375rem] leading-snug text-ivory hover:bg-navy-700/40" onClick={() => onEditPref(c.key, x.id)} data-testid={`pref-item-${x.id}`}>
                            {x.text}
                          </button>
                        ) : (
                          <p className="py-1 text-[0.9375rem] leading-snug text-ivory">{x.text}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function PreferenceSheet({ target, onClose }: { target: PrefTarget; onClose: () => void }) {
  const person = useStore((s) => s.preferences.find((p) => p.id === target.personId));
  const add = useStore((s) => s.addPreference);
  const update = useStore((s) => s.updatePreference);
  const remove = useStore((s) => s.removePreference);
  const existing = target.prefId ? person?.preferences.find((x) => x.id === target.prefId) : undefined;
  const cat = PREFERENCE_CATEGORIES.find((c) => c.key === target.category)!;
  const [text, setText] = useState(existing?.text ?? "");
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  if (!person || (target.prefId && !existing)) return null;

  const save = () => {
    const res = existing ? update(person.id, existing.id, text) : add(person.id, target.category, text);
    if (!res.ok) return setError(res.error);
    report(res, existing ? "Preference saved" : "Preference added");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? "Edit preference" : `Add ${cat.label.toLowerCase()}`}
      subtitle={`${person.name} · ${cat.label}`}
      footer={
        confirm ? (
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              Keep it
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => report(remove(person.id, existing!.id), "Preference deleted") && onClose()} data-testid="pref-delete-confirm">
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save} data-testid="pref-save">
              {existing ? "Save" : "Add"}
            </Button>
          </>
        )
      }
    >
      {confirm ? (
        <p className="text-sm text-slate leading-relaxed">Delete &ldquo;{existing?.text}&rdquo;? The audit history keeps a record.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field label="Preference" htmlFor="pref-text" error={error}>
            <textarea id="pref-text" className="field min-h-24" value={text} onChange={(e) => setText(e.target.value)} maxLength={PREFERENCE_MAX} placeholder={cat.example} aria-invalid={!!error} data-testid="pref-text" />
          </Field>
          {existing && (
            <Button type="button" variant="danger" size="sm" className="mt-1" onClick={() => setConfirm(true)} data-testid="pref-delete">
              <Trash2 className="size-4" aria-hidden /> Delete preference
            </Button>
          )}
        </form>
      )}
    </Sheet>
  );
}

const RELATIONS: Relation[] = ["family", "guest", "staff"];

function PersonSheet({ target, onClose }: { target: PersonTarget; onClose: () => void }) {
  const existing = useStore((s) => (target.personId ? s.preferences.find((p) => p.id === target.personId) : undefined));
  const add = useStore((s) => s.addPerson);
  const update = useStore((s) => s.updatePerson);
  const remove = useStore((s) => s.removePerson);
  const [name, setName] = useState(existing?.name ?? "");
  const [relation, setRelation] = useState<Relation>(existing && existing.relation !== "principal" ? existing.relation : "family");
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const isPrincipal = existing?.relation === "principal";
  if (target.personId && !existing) return null;

  const save = () => {
    const res = existing ? update(existing.id, { name, relation: isPrincipal ? undefined : relation }) : add(name, relation);
    if (!res.ok) return setError(res.error);
    report(res, existing ? "Saved" : `Added ${name.trim()}`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : "Add Person"}
      subtitle={existing ? undefined : "Family, guests or staff who fly regularly"}
      footer={
        confirm && existing ? (
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              Keep
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => report(remove(existing.id), `Removed ${existing.name}`) && onClose()} data-testid="pref-remove-person-confirm">
              Remove
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save} data-testid="pref-person-save">
              {existing ? "Save" : "Add Person"}
            </Button>
          </>
        )
      }
    >
      {confirm && existing ? (
        <p className="text-sm text-slate leading-relaxed">
          Remove {existing.name} and their {existing.preferences.length} preference{existing.preferences.length === 1 ? "" : "s"}? The audit history keeps a record.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field label="Name" htmlFor="pref-person-name" error={error}>
            <input id="pref-person-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="e.g. Family Member D" autoComplete="off" aria-invalid={!!error} data-testid="pref-person-name" />
          </Field>
          {!isPrincipal && (
            <Field label="Who they are" htmlFor="pref-person-relation">
              <select id="pref-person-relation" className="field" value={relation} onChange={(e) => setRelation(e.target.value as Relation)} data-testid="pref-person-relation">
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {RELATION_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {isPrincipal && <Badge tone="gold">Principal</Badge>}
          <button type="submit" hidden />
          {existing && !isPrincipal && (
            <Button type="button" variant="danger" size="sm" className="mt-2" onClick={() => setConfirm(true)} data-testid="pref-remove-person">
              <Trash2 className="size-4" aria-hidden /> Remove person
            </Button>
          )}
        </form>
      )}
    </Sheet>
  );
}
