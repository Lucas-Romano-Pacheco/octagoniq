-- Contas e palpites do OctagonIQ (cole no SQL Editor do Supabase e rode; pode rodar de novo sem perder dados)

-- ---------- Perfis: o apelido de cada conta ----------

create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  username   text        not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

-- apelido único sem diferenciar maiúsculas ("Lucas" e "lucas" são o mesmo)
create unique index if not exists profiles_username_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "apelidos sao publicos"   on public.profiles;
drop policy if exists "editar o proprio perfil" on public.profiles;

-- o perfil só tem id e apelido: pode ser lido por todos (vai aparecer no ranking entre usuários)
create policy "apelidos sao publicos"   on public.profiles for select using (true);
create policy "editar o proprio perfil" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- cria o perfil junto com a conta, com o apelido escolhido no cadastro (quem entra pelo Google ganha um provisório)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', 'lutador_' || substr(replace(new.id::text, '-', ''), 1, 8)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- o formulário de cadastro pergunta se o apelido está livre antes de criar a conta
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------- Palpites ----------

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

-- horário da luta (ESPN), enviado junto com o palpite: a partir dele o palpite fica visível para todos (aba Ranking)
alter table public.picks add column if not exists locks_at timestamptz;

-- a hora do palpite é sempre a do servidor (o navegador não consegue "voltar no tempo" para palpitar depois da luta),
-- e luta que já começou não aceita palpite novo nem mudança
create or replace function public.picks_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.locks_at is not null and new.locks_at <= now() then
    raise exception 'a luta já começou: palpite fechado';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists picks_stamp on public.picks;
create trigger picks_stamp before insert or update on public.picks for each row execute function public.picks_stamp();

-- Segurança por linha: cada pessoa vê e altera somente os próprios palpites.
alter table public.picks enable row level security;

drop policy if exists "ler os proprios palpites"    on public.picks;
drop policy if exists "criar os proprios palpites"  on public.picks;
drop policy if exists "editar os proprios palpites" on public.picks;
drop policy if exists "apagar os proprios palpites" on public.picks;
drop policy if exists "palpites revelados quando a luta comeca" on public.picks;

create policy "ler os proprios palpites"    on public.picks for select using (auth.uid() = user_id);
create policy "criar os proprios palpites"  on public.picks for insert with check (auth.uid() = user_id);
create policy "editar os proprios palpites" on public.picks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- apagar só o que ainda não fechou (ninguém apaga um palpite errado depois do resultado)
create policy "apagar os proprios palpites" on public.picks for delete using (auth.uid() = user_id and (locks_at is null or locks_at > now()));
-- ranking: o palpite dos outros só aparece depois do horário da luta (antes disso, ninguém copia ninguém)
create policy "palpites revelados quando a luta comeca" on public.picks for select using (locks_at is not null and locks_at <= now());

-- quem já palpitou em cada luta de um evento, sem dizer em quem (a aba Ranking mostra os participantes antes
-- de a luta começar; o palpite em si continua escondido pela regra acima)
create or replace function public.event_participation(eid text) returns table (user_id uuid, fight_id text)
language sql stable security definer set search_path = '' as $$
  select p.user_id, p.fight_id from public.picks p where p.event_id = eid;
$$;
grant execute on function public.event_participation(text) to anon, authenticated;

-- palpite da galera em cada luta, só em totais (quantos votos em cada lutador), sem dizer quem votou em quem:
-- a página da luta compara com a probabilidade das casas de aposta
create or replace function public.event_crowd(eid text) returns table (fight_id text, winner text, votes bigint)
language sql stable security definer set search_path = '' as $$
  select p.fight_id, p.winner, count(*) from public.picks p where p.event_id = eid and p.fight_id <> 'fotn' group by p.fight_id, p.winner;
$$;
grant execute on function public.event_crowd(text) to anon, authenticated;

-- Observação: o ranking soma os pontos com o horário real de cada luta (ESPN) e ignora palpites com updated_at
-- posterior a ele, então mesmo um locks_at falso enviado à mão não dá vantagem.

-- ---------- "Seja o 4º juiz": a nota de cada round dada pelos usuários ----------

create table if not exists public.round_scores (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  event_id   text        not null,
  fight_id   text        not null,
  round      smallint    not null check (round between 1 and 5),
  red        smallint    not null check (red between 7 and 10),
  blue       smallint    not null check (blue between 7 and 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id, fight_id, round),
  check (red = 10 or blue = 10)                         -- como no cartão oficial: o vencedor do round leva 10
);

alter table public.round_scores enable row level security;

drop policy if exists "ver as proprias notas"    on public.round_scores;
drop policy if exists "dar as proprias notas"    on public.round_scores;
drop policy if exists "mudar as proprias notas"  on public.round_scores;
drop policy if exists "apagar as proprias notas" on public.round_scores;

create policy "ver as proprias notas"    on public.round_scores for select using (auth.uid() = user_id);
create policy "dar as proprias notas"    on public.round_scores for insert with check (auth.uid() = user_id);
create policy "mudar as proprias notas"  on public.round_scores for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar as proprias notas" on public.round_scores for delete using (auth.uid() = user_id);

-- notas da galera, sem identificar ninguém: quantas pessoas deram cada nota em cada round...
create or replace function public.fight_fan_rounds(eid text, fid text) returns table (round smallint, red smallint, blue smallint, votes bigint)
language sql stable security definer set search_path = '' as $$
  select s.round, s.red, s.blue, count(*) from public.round_scores s where s.event_id = eid and s.fight_id = fid group by s.round, s.red, s.blue;
$$;
-- ...e o cartão completo de cada pessoa (soma dos rounds), para dizer a quem a galera deu a luta
create or replace function public.fight_fan_cards(eid text, fid text) returns table (rounds bigint, red bigint, blue bigint)
language sql stable security definer set search_path = '' as $$
  select count(*), sum(s.red), sum(s.blue) from public.round_scores s where s.event_id = eid and s.fight_id = fid group by s.user_id;
$$;
grant execute on function public.fight_fan_rounds(text, text) to anon, authenticated;
grant execute on function public.fight_fan_cards(text, text) to anon, authenticated;

-- ---------- Administração (rode só quando precisar) ----------
-- O login é apelido + senha. Por baixo, o Supabase guarda cada conta com um e-mail interno
-- (apelido em minúsculas + "@octagoniq.vercel.app"), que nunca recebe mensagens. As senhas ficam só como hash:
-- ninguém consegue vê-las, nem pelo painel. Para redefinir a senha de alguém que esqueceu:
--
--   update auth.users
--   set encrypted_password = extensions.crypt('NOVA_SENHA_AQUI', extensions.gen_salt('bf'))
--   where email = 'apelido_da_pessoa@octagoniq.vercel.app';

