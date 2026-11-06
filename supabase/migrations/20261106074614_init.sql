-- ============================================================
-- Профили и роли
-- ============================================================

create type public.user_role as enum ('manager', 'executor');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Новый пользователь',
  -- по умолчанию минимальные права; постановщиков назначают вручную (seed / SQL)
  role public.user_role not null default 'executor'
);

-- Профиль создаётся вместе с пользователем. Роль из user_metadata не берём:
-- пользователь может менять свои metadata сам. Email в имя не подставляем: профили видят все вошедшие.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Новый пользователь'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security definer: политики других таблиц вызывают её, не упираясь в RLS profiles
create function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
$$;

-- ============================================================
-- Справочники статусов и переходов
-- ============================================================

create table public.task_statuses (
  code text primary key,
  label text not null,
  sort_order int not null,
  -- в финальном статусе задачу нельзя редактировать
  is_final boolean not null default false
);

insert into public.task_statuses (code, label, sort_order, is_final) values
  ('new',         'Новая',        1, false),
  ('in_progress', 'В работе',     2, false),
  ('review',      'На проверке',  3, false),
  ('rework',      'На доработке', 4, false),
  ('accepted',    'Принята',      5, true);

create table public.task_transitions (
  from_status text not null references public.task_statuses (code),
  to_status text not null references public.task_statuses (code),
  -- manager — любой постановщик, assignee — назначенный исполнитель задачи
  actor text not null check (actor in ('manager', 'assignee')),
  comment_required boolean not null default false,
  primary key (from_status, to_status)
);

insert into public.task_transitions (from_status, to_status, actor, comment_required) values
  ('new',         'in_progress', 'assignee', false),
  ('in_progress', 'review',      'assignee', false),
  ('review',      'accepted',    'manager',  false),
  ('review',      'rework',      'manager',  true),
  ('rework',      'in_progress', 'assignee', false);

-- ============================================================
-- Объекты, задачи, история
-- ============================================================

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text not null default '',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  assignee_id uuid not null references public.profiles (id),
  status text not null default 'new' references public.task_statuses (code),
  author_id uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  -- заполнены, если менялся статус
  from_status text references public.task_statuses (code),
  to_status text references public.task_statuses (code),
  comment text,
  -- правки полей: {"title": {"old": "...", "new": "..."}, "assignee": {...}}
  -- для объекта и исполнителя пишем имена на момент правки: у читателя может не быть доступа к старым
  changes jsonb
);

create index task_history_task_id_idx on public.task_history (task_id);

-- ============================================================
-- Триггеры задач
-- ============================================================

-- Исполнитель — только пользователь с ролью executor.
-- Смена исполнителя сбрасывает статус в «Новая».
create function public.tasks_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id then
    if not exists (select 1 from public.profiles where id = new.assignee_id and role = 'executor') then
      raise exception 'Исполнителем можно назначить только пользователя с ролью «исполнитель»'
        using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.assignee_id is distinct from old.assignee_id then
    new.status := 'new';
  end if;
  return new;
end $$;

create trigger tasks_before_write
  before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- История создания и правок полей. Смены статуса пишет change_task_status:
-- обычным UPDATE статус поменять нельзя (нет прав на колонку).
create function public.tasks_log_history() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  diff jsonb := '{}';
begin
  if tg_op = 'INSERT' then
    insert into public.task_history (task_id, changed_by, to_status)
    values (new.id, auth.uid(), new.status);
    return null;
  end if;

  if new.title is distinct from old.title then
    diff := diff || jsonb_build_object('title', jsonb_build_object('old', old.title, 'new', new.title));
  end if;
  if new.description is distinct from old.description then
    diff := diff || jsonb_build_object('description', jsonb_build_object('old', old.description, 'new', new.description));
  end if;
  if new.object_id is distinct from old.object_id then
    diff := diff || jsonb_build_object('object', jsonb_build_object(
      'old', (select name from public.objects where id = old.object_id),
      'new', (select name from public.objects where id = new.object_id)));
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    diff := diff || jsonb_build_object('assignee', jsonb_build_object(
      'old', (select full_name from public.profiles where id = old.assignee_id),
      'new', (select full_name from public.profiles where id = new.assignee_id)));
  end if;

  if diff = '{}' then
    return null;
  end if;

  insert into public.task_history (task_id, changed_by, from_status, to_status, changes)
  values (
    new.id, auth.uid(),
    case when new.status <> old.status then old.status end,
    case when new.status <> old.status then new.status end,
    diff
  );
  return null;
end $$;

create trigger tasks_log_history
  after insert or update on public.tasks
  for each row execute function public.tasks_log_history();

-- ============================================================
-- Смена статуса: единственный путь
-- ============================================================

create function public.change_task_status(p_task_id uuid, p_to_status text, p_comment text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks;
  tr public.task_transitions;
  me uuid := auth.uid();
  note text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into t from public.tasks where id = p_task_id for update;
  -- чужая задача для исполнителя выглядит как несуществующая.
  -- Код ошибки по умолчанию (P0001 → HTTP 400): с no_data_found (→ 404) текст не доходит до клиента
  if not found or not (public.is_manager() or t.assignee_id = me) then
    raise exception 'Задача не найдена';
  end if;

  select * into tr from public.task_transitions
  where from_status = t.status and to_status = p_to_status;
  if not found then
    raise exception 'Смена статуса «%» → «%» запрещена', t.status, p_to_status
      using errcode = 'check_violation';
  end if;

  if tr.actor = 'manager' and not public.is_manager() then
    raise exception 'Такая смена статуса доступна только постановщику' using errcode = 'insufficient_privilege';
  end if;
  if tr.actor = 'assignee' and t.assignee_id is distinct from me then
    raise exception 'Такая смена статуса доступна только назначенному исполнителю' using errcode = 'insufficient_privilege';
  end if;
  if tr.comment_required and note is null then
    raise exception 'Для такой смены статуса нужен комментарий' using errcode = 'check_violation';
  end if;

  update public.tasks set status = p_to_status where id = p_task_id;

  insert into public.task_history (task_id, changed_by, from_status, to_status, comment)
  values (p_task_id, me, t.status, p_to_status, note);
end $$;

-- ============================================================
-- Права: сначала всё закрываем, потом открываем нужное
-- ============================================================

revoke all on
  public.profiles, public.task_statuses, public.task_transitions,
  public.objects, public.tasks, public.task_history
from anon, authenticated;

grant select on public.profiles, public.task_statuses, public.task_transitions, public.task_history to authenticated;
grant select, insert, update, delete on public.objects to authenticated;
grant select, delete on public.tasks to authenticated;
-- статус, автор и дата создания недоступны для записи никому из клиентов
grant insert (object_id, title, description, assignee_id) on public.tasks to authenticated;
grant update (object_id, title, description, assignee_id) on public.tasks to authenticated;

revoke execute on function
  public.handle_new_user(), public.is_manager(), public.tasks_before_write(),
  public.tasks_log_history(), public.change_task_status(uuid, text, text)
from public, anon;
grant execute on function public.is_manager(), public.change_task_status(uuid, text, text) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.task_statuses enable row level security;
alter table public.task_transitions enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

create policy "Профили видят все вошедшие" on public.profiles
  for select to authenticated using (true);

create policy "Статусы видят все вошедшие" on public.task_statuses
  for select to authenticated using (true);

create policy "Переходы видят все вошедшие" on public.task_transitions
  for select to authenticated using (true);

create policy "Объекты: постановщик — все, исполнитель — где есть его задачи" on public.objects
  for select to authenticated using (
    (select public.is_manager())
    or exists (select 1 from public.tasks t where t.object_id = objects.id and t.assignee_id = (select auth.uid()))
  );
create policy "Объекты создаёт постановщик" on public.objects
  for insert to authenticated with check ((select public.is_manager()));
create policy "Объекты меняет постановщик" on public.objects
  for update to authenticated using ((select public.is_manager())) with check ((select public.is_manager()));
create policy "Объекты удаляет постановщик" on public.objects
  for delete to authenticated using ((select public.is_manager()));

create policy "Задачи: постановщик — все, исполнитель — свои" on public.tasks
  for select to authenticated using ((select public.is_manager()) or assignee_id = (select auth.uid()));
create policy "Задачи создаёт постановщик" on public.tasks
  for insert to authenticated with check ((select public.is_manager()));
create policy "Задачи меняет постановщик, пока статус не финальный" on public.tasks
  for update to authenticated
  using (
    (select public.is_manager())
    and not exists (select 1 from public.task_statuses s where s.code = tasks.status and s.is_final)
  )
  with check ((select public.is_manager()));
create policy "Задачи удаляет постановщик" on public.tasks
  for delete to authenticated using ((select public.is_manager()));

-- видна тем, кто видит задачу (подзапрос сам проходит через RLS задач);
-- политик на запись нет и прав на запись нет: пишут только триггер и change_task_status
create policy "История видна тем, кто видит задачу" on public.task_history
  for select to authenticated using (exists (select 1 from public.tasks t where t.id = task_history.task_id));
