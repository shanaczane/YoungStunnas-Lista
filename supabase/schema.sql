-- Run this in your Supabase SQL editor to set up Lista's database schema.

-- Spaces (shared workspaces)
create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Space members
create table if not exists space_members (
  space_id uuid references spaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  display_name text,
  joined_at timestamptz default now(),
  primary key (space_id, user_id)
);

-- Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  space_id uuid references spaces(id) on delete cascade,
  content text not null,
  task_name text not null,
  due_date timestamptz,
  category text check (category in ('School','Work','Personal','Errands','Health')) default 'Personal',
  assignee text,
  notes text default '',
  reminder_minutes int,
  is_complete boolean default false,
  created_at timestamptz default now()
);

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  color text not null,   -- hex e.g. '#a855f7'
  emoji text,            -- e.g. '📚'
  created_at timestamptz default now()
);

-- Row-level security
alter table tasks enable row level security;
alter table spaces enable row level security;
alter table space_members enable row level security;

-- Tasks: users see their own tasks + tasks in spaces they belong to
create policy "tasks_select" on tasks for select
  using (
    user_id = auth.uid()
    or space_id in (
      select space_id from space_members where user_id = auth.uid()
    )
  );

create policy "tasks_insert" on tasks for insert
  with check (user_id = auth.uid());

create policy "tasks_update" on tasks for update
  using (
    user_id = auth.uid()
    or space_id in (
      select space_id from space_members where user_id = auth.uid()
    )
  );

create policy "tasks_delete" on tasks for delete
  using (user_id = auth.uid());

-- Spaces: visible to members
create policy "spaces_select" on spaces for select
  using (
    owner_id = auth.uid()
    or id in (
      select space_id from space_members where user_id = auth.uid()
    )
  );

create policy "spaces_insert" on spaces for insert
  with check (owner_id = auth.uid());

create policy "spaces_update" on spaces for update
  using (owner_id = auth.uid());

create policy "spaces_delete" on spaces for delete
  using (owner_id = auth.uid());

-- Space members: visible to all members of the space
create policy "space_members_select" on space_members for select
  using (
    space_id in (
      select space_id from space_members where user_id = auth.uid()
    )
    or space_id in (
      select id from spaces where owner_id = auth.uid()
    )
  );

create policy "space_members_insert" on space_members for insert
  with check (
    space_id in (
      select id from spaces where owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

create policy "space_members_delete" on space_members for delete
  using (
    space_id in (
      select id from spaces where owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- Categories RLS
alter table categories enable row level security;
create policy "Users manage own categories" on categories
  for all using (auth.uid() = user_id);

-- Add a policy allowing users to read space_members they belong to
create policy "Members can view space_members" on space_members
  for select using (
    user_id = auth.uid()
    or space_id in (
      select space_id from space_members where user_id = auth.uid()
    )
  );

-- Storage bucket for profile avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS policies for avatar files (scoped per user folder)
drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects
  for select
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- Enable realtime for tasks and spaces
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table space_members;
