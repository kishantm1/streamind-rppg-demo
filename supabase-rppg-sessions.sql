-- rppg_sessions: heart-rate measurement sessions per user

create table public.rppg_sessions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  avg_bpm     smallint not null check (avg_bpm between 30 and 250),
  min_bpm     smallint not null check (min_bpm between 30 and 250),
  max_bpm     smallint not null check (max_bpm between 30 and 250),
  duration_s  real not null check (duration_s > 0),
  ble_avg_bpm smallint check (ble_avg_bpm between 30 and 250),
  ble_min_bpm smallint check (ble_min_bpm between 30 and 250),
  ble_max_bpm smallint check (ble_max_bpm between 30 and 250),
  created_at  timestamptz not null default now()
);

comment on table public.rppg_sessions is
  'Heart-rate measurement sessions recorded by the rPPG webcam app.';

-- RLS
alter table public.rppg_sessions enable row level security;

create policy "Users can view own sessions"
  on public.rppg_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.rppg_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.rppg_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.rppg_sessions for delete
  using (auth.uid() = user_id);

-- Index for fast lookups by user
create index idx_rppg_sessions_user_recorded
  on public.rppg_sessions (user_id, recorded_at desc);
