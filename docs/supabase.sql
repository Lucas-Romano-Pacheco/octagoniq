-- Palpites do OctagonIQ (cole no SQL Editor do Supabase e rode uma vez)

create table if not exists public.picks (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  event_id   text        not null,                       -- id do evento (ESPN)
  fight_id   text        not null,                       -- id da luta (ESPN)
  winner     text        not null,                       -- id do lutador escolhido (ESPN)
  method     text        check (method in ('ko', 'sub', 'dec')),
  round      smallint    check (round between 1 and 5),
  updated_at timestamptz not null default now(),         -- quando a pessoa salvou: usado para ignorar palpites tardios
  primary key (user_id, event_id, fight_id)
);

create index if not exists picks_event_idx on public.picks (event_id);

-- Segurança por linha: cada pessoa vê e altera somente os próprios palpites.
alter table public.picks enable row level security;

drop policy if exists "ler os proprios palpites"    on public.picks;
drop policy if exists "criar os proprios palpites"  on public.picks;
drop policy if exists "editar os proprios palpites" on public.picks;
drop policy if exists "apagar os proprios palpites" on public.picks;

create policy "ler os proprios palpites"    on public.picks for select using (auth.uid() = user_id);
create policy "criar os proprios palpites"  on public.picks for insert with check (auth.uid() = user_id);
create policy "editar os proprios palpites" on public.picks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar os proprios palpites" on public.picks for delete using (auth.uid() = user_id);

-- Observação: a trava "palpite fecha quando a luta começa" existe na interface. Para o ranking entre usuários (próximo
-- passo), a pontuação deve ser calculada no servidor ignorando linhas com updated_at posterior ao início da luta.
