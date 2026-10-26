-- CabinSafe Intelligence — PostgreSQL / Supabase schema with row-level security.
--
-- STATUS: provided for the production path. The demonstration build persists
-- data on-device; this schema has NOT been applied or verified against a live
-- Supabase project. Review with a security engineer before use.
--
-- Principles
--  * Every table has RLS enabled; nothing is readable without an authenticated crew identity.
--  * Restricted medical information lives in its own table, readable only by the Lead CA.
--  * The audit log is append-only and written by triggers/RPCs, never directly by clients.
--  * Only synthetic data may be loaded into non-production environments.

create extension if not exists "pgcrypto";

-- ───────────── Roles & crew ─────────────
create type crew_role as enum ('lead', 'contract_ca', 'pilot', 'security', 'assistant');

create table crew_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  title text not null,
  role crew_role not null,
  employment text not null check (employment in ('staff', 'contract')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function app_crew_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from crew_members where auth_user_id = auth.uid() and active
$$;

create or replace function app_role() returns crew_role
language sql stable security definer set search_path = public as $$
  select role from crew_members where auth_user_id = auth.uid() and active
$$;

-- ───────────── Aircraft & flights ─────────────
create table aircraft (
  id uuid primary key default gen_random_uuid(),
  tail text not null unique,
  type text not null,
  configuration text,
  verification_notice text not null
);

create table flights (
  id uuid primary key default gen_random_uuid(),
  callsign text not null unique check (callsign ~ '^[A-Z0-9]{3,8}$'),
  aircraft_id uuid not null references aircraft (id),
  departure char(4) not null,
  destination char(4) not null check (destination <> departure),
  alternates char(4)[] not null default '{}',
  depart_at timestamptz not null,
  arrive_at timestamptz not null check (arrive_at > depart_at),
  lead_id uuid not null references crew_members (id),
  cabin_attendant_id uuid references crew_members (id),
  status text not null default 'scheduled' check (status in ('planning', 'scheduled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create table flight_crew (
  flight_id uuid references flights (id) on delete cascade,
  crew_id uuid references crew_members (id),
  position text not null,
  primary key (flight_id, crew_id)
);

-- ───────────── Passengers ─────────────
create table passengers (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  relationship text not null,
  category text not null check (category in ('principal', 'family', 'guest', 'pet')),
  dietary text[] not null default '{}',
  preferences text[] not null default '{}',
  emergency_plan_ref text
);

create table accommodations (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references passengers (id) on delete cascade,
  type text not null check (type in ('mobility', 'allergy', 'medical_equipment', 'medical_plan', 'dietary', 'pet', 'comfort')),
  summary text not null,                 -- operational summary only; no diagnosis
  documentation text not null check (documentation in ('documented', 'pending_confirmation')),
  plan_ref text,
  allergen text
);

-- Lead-CA-only restricted information, separated so it is never selected with general passenger data.
create table passenger_restricted (
  passenger_id uuid primary key references passengers (id) on delete cascade,
  restricted_medical text,
  restricted_notes text,
  updated_at timestamptz not null default now()
);

create table manifests (
  flight_id uuid references flights (id) on delete cascade,
  passenger_id uuid references passengers (id),
  added_at timestamptz not null default now(),
  primary key (flight_id, passenger_id)
);

-- ───────────── Tasks & checklists ─────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references flights (id) on delete cascade,
  title text not null,
  detail text,
  category text not null,
  phase text not null check (phase in ('preflight', 'postflight')),
  source text not null check (source in ('checklist', 'passenger_rule', 'advisory', 'equipment', 'manual', 'handover')),
  source_ref text,
  rule_key text,                          -- unique per (flight, passenger, rule) for generated tasks
  passenger_id uuid references passengers (id),
  priority text not null check (priority in ('critical', 'high', 'normal')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'blocked', 'not_applicable')),
  assignee_id uuid references crew_members (id),
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references crew_members (id),
  notes text,
  na_reason text,
  blocked_reason text,
  requires_sign_off boolean not null default false,
  signed_off_by uuid references crew_members (id),
  signed_off_at timestamptz,
  reviewed boolean not null default false,
  document_ref text,
  created_at timestamptz not null default now(),
  constraint na_requires_reason check (status <> 'not_applicable' or coalesce(na_reason, '') <> ''),
  constraint blocked_requires_reason check (status <> 'blocked' or coalesce(blocked_reason, '') <> ''),
  unique (flight_id, passenger_id, rule_key)
);

-- ───────────── Equipment ─────────────
create table equipment (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references aircraft (id),
  code text not null,
  name text not null,
  category text not null,
  zone text not null,
  map_x numeric, map_y numeric,           -- conceptual positions; verification required
  critical boolean not null default false,
  status text not null default 'serviceable',
  inspection_interval_days int not null check (inspection_interval_days > 0),
  last_inspection_at timestamptz,
  next_inspection_due timestamptz not null,
  expires_at timestamptz,
  unique (aircraft_id, code)
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment (id),
  inspected_by uuid not null references crew_members (id),
  inspected_at timestamptz not null default now(),
  result text not null check (result in ('pass', 'pass_with_note', 'fail')),
  checks jsonb not null,
  notes text
);

create table discrepancies (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references equipment (id),
  flight_id uuid references flights (id),
  title text not null,
  detail text,
  severity text not null check (severity in ('critical', 'major', 'minor')),
  phase text not null check (phase in ('preflight', 'postflight', 'inspection')),
  status text not null default 'open' check (status in ('open', 'deferred', 'resolved')),
  resolution text,
  reported_by uuid not null references crew_members (id),
  reported_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ───────────── Advisories & handovers ─────────────
create table advisory_acks (
  advisory_id text not null,              -- source identifier (live feed id or simulated id)
  flight_id uuid not null references flights (id) on delete cascade,
  advisory_title text not null,
  origin text not null check (origin in ('live', 'simulated')),
  acked_by uuid not null references crew_members (id),
  acked_at timestamptz not null default now(),
  task_id uuid references tasks (id),
  primary key (advisory_id, flight_id)
);

create table handovers (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references flights (id),
  outgoing_id uuid not null references crew_members (id),
  incoming_id uuid not null references crew_members (id) check (incoming_id <> outgoing_id),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'accepted')),
  open_task_ids uuid[] not null default '{}',
  equipment_summary text,
  accommodation_summary text,
  notes text,
  created_by uuid not null references crew_members (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references crew_members (id)
);

create table handover_acks (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references handovers (id) on delete cascade,
  label text not null,
  acked_at timestamptz
);

-- ───────────── Audit (append-only) ─────────────
create table audit_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid references crew_members (id),
  actor_role crew_role,
  action text not null,
  entity text not null,
  entity_id text not null,
  flight_id uuid,
  summary text not null,
  diff jsonb
);

create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_events (actor_id, actor_role, action, entity, entity_id, flight_id, summary, diff)
  values (
    app_crew_id(), app_role(),
    tg_table_name || '.' || lower(tg_op), tg_table_name,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'), ''),
    nullif(coalesce(to_jsonb(new) ->> 'flight_id', to_jsonb(old) ->> 'flight_id'), '')::uuid,
    tg_op || ' ' || tg_table_name,
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['flights', 'manifests', 'tasks', 'inspections', 'discrepancies', 'equipment', 'advisory_acks', 'handovers', 'handover_acks', 'accommodations'] loop
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row()', t, t);
  end loop;
end $$;

-- ───────────── Row-level security ─────────────
alter table crew_members enable row level security;
alter table aircraft enable row level security;
alter table flights enable row level security;
alter table flight_crew enable row level security;
alter table passengers enable row level security;
alter table accommodations enable row level security;
alter table passenger_restricted enable row level security;
alter table manifests enable row level security;
alter table tasks enable row level security;
alter table equipment enable row level security;
alter table inspections enable row level security;
alter table discrepancies enable row level security;
alter table advisory_acks enable row level security;
alter table handovers enable row level security;
alter table handover_acks enable row level security;
alter table audit_events enable row level security;

-- Any active crew member may read operational data.
create policy crew_read on crew_members for select using (app_crew_id() is not null);
create policy crew_read on aircraft for select using (app_crew_id() is not null);
create policy crew_read on flights for select using (app_crew_id() is not null);
create policy crew_read on flight_crew for select using (app_crew_id() is not null);
create policy crew_read on passengers for select using (app_crew_id() is not null);
create policy crew_read on manifests for select using (app_crew_id() is not null);
create policy crew_read on tasks for select using (app_crew_id() is not null);
create policy crew_read on equipment for select using (app_crew_id() is not null);
create policy crew_read on inspections for select using (app_crew_id() is not null);
create policy crew_read on discrepancies for select using (app_crew_id() is not null);
create policy crew_read on advisory_acks for select using (app_crew_id() is not null);
create policy crew_read on handovers for select using (app_crew_id() is not null);
create policy crew_read on handover_acks for select using (app_crew_id() is not null);

-- Accommodation summaries: medical types visible only to lead; others see non-medical types.
create policy acc_read on accommodations for select using (
  app_role() = 'lead' or (app_crew_id() is not null and type not in ('medical_plan', 'medical_equipment'))
);

-- Restricted medical information: Lead Cabin Attendant only.
create policy restricted_lead_only on passenger_restricted for all using (app_role() = 'lead') with check (app_role() = 'lead');

-- Lead CA manages flights, manifests, passengers and accommodations.
create policy lead_write on flights for all using (app_role() = 'lead') with check (app_role() = 'lead');
create policy lead_write on manifests for all using (app_role() = 'lead') with check (app_role() = 'lead');
create policy lead_write on passengers for all using (app_role() = 'lead') with check (app_role() = 'lead');
create policy lead_write on accommodations for all using (app_role() = 'lead') with check (app_role() = 'lead');

-- Tasks: lead may change any; others only tasks assigned to them, and may not reassign.
create policy task_insert on tasks for insert with check (app_role() = 'lead');
create policy task_update_lead on tasks for update using (app_role() = 'lead') with check (app_role() = 'lead');
create policy task_update_own on tasks for update using (assignee_id = app_crew_id()) with check (assignee_id = app_crew_id());

-- Equipment inspections & discrepancies: cabin attendants record; lead resolves.
create policy inspect_insert on inspections for insert with check (app_role() in ('lead', 'contract_ca') and inspected_by = app_crew_id());
create policy equipment_update on equipment for update using (app_role() in ('lead', 'contract_ca'));
create policy discrepancy_insert on discrepancies for insert with check (app_role() in ('lead', 'contract_ca') and reported_by = app_crew_id());
create policy discrepancy_update on discrepancies for update using (app_role() = 'lead');

-- Advisory acknowledgements.
create policy ack_insert on advisory_acks for insert with check (app_role() in ('lead', 'contract_ca', 'pilot', 'security') and acked_by = app_crew_id());

-- Handovers: cabin attendants create; only the incoming attendant acknowledges and accepts.
create policy handover_insert on handovers for insert with check (app_role() in ('lead', 'contract_ca') and created_by = app_crew_id());
create policy handover_accept on handovers for update using (incoming_id = app_crew_id()) with check (incoming_id = app_crew_id());
create policy handover_ack_update on handover_acks for update using (
  exists (select 1 from handovers h where h.id = handover_id and h.incoming_id = app_crew_id() and h.status <> 'accepted')
);
create policy handover_ack_insert on handover_acks for insert with check (
  exists (select 1 from handovers h where h.id = handover_id and h.created_by = app_crew_id())
);

-- Audit: lead and flight crew may read; nobody may write directly (triggers use security definer).
create policy audit_read on audit_events for select using (app_role() in ('lead', 'pilot'));
revoke insert, update, delete on audit_events from anon, authenticated;
