-- Additive migration; private_questions and the legacy demo remain unchanged.
begin;
create table public.question_threads (
 id uuid primary key,
 student_id uuid not null references public.member_accounts on delete cascade,
 assignment_id uuid references public.teacher_assignments,
 title text not null check(length(btrim(title)) between 1 and 120),
 body text not null check(length(btrim(body)) between 1 and 4000),
 visibility text not null default 'private' check(visibility in ('private','teacher')),
 status text not null default 'waiting' check(status in ('waiting','answered','follow_up','resolved')),
 version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(visibility='private' or assignment_id is not null)
);
create table public.question_messages (
 id uuid primary key default gen_random_uuid(),
 thread_id uuid not null references public.question_threads on delete cascade,
 author_id uuid not null references public.member_accounts,
 kind text not null check(kind in ('answer','follow_up')),
 body text not null check(length(btrim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),
 sequence integer not null,
 unique(thread_id,sequence)
);
create index question_threads_owner on public.question_threads(student_id,updated_at desc);
create index question_threads_assignment on public.question_threads(assignment_id,updated_at desc);

create function muleum_private.question_student() returns boolean
language sql stable security definer set search_path='' as $$
 select muleum_private.has_role('student') and exists (
 select 1 from public.member_accounts where user_id=auth.uid() and enrollment='active');
$$;
create function muleum_private.can_read_question(p_thread uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select muleum_private.active_member(auth.uid()) and exists (
 select 1 from public.question_threads q where q.id=p_thread and (
 q.student_id=auth.uid() or (
 q.visibility='teacher' and muleum_private.has_role('teacher')
 and muleum_private.has_role('student',q.student_id)
 and exists(select 1 from public.member_accounts where user_id=q.student_id and enrollment='active')
 and exists(select 1 from public.teacher_assignments a where a.id=q.assignment_id
 and a.student_id=q.student_id and a.teacher_id=auth.uid() and a.status='approved'))));
$$;
alter table public.question_threads enable row level security;
alter table public.question_messages enable row level security;
revoke all on public.question_threads,public.question_messages from public,anon,authenticated;
grant select on public.question_threads,public.question_messages to authenticated;
create policy question_thread_read on public.question_threads for select to authenticated
 using(muleum_private.can_read_question(id));
create policy question_message_read on public.question_messages for select to authenticated
 using(muleum_private.can_read_question(thread_id));

-- Mutations are RPC-only: callers cannot supply an author or arbitrary status.
create function public.create_question(p_id uuid,p_title text,p_body text,p_visibility text)
returns uuid language plpgsql security definer set search_path='' as $$
declare assignment uuid; existing public.question_threads;
begin
 if not muleum_private.question_student() then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_id is null or p_visibility is null or p_visibility not in ('private','teacher')
 or p_title is null or length(btrim(p_title)) not between 1 and 120
 or p_body is null or length(btrim(p_body)) not between 1 and 4000 then
 raise exception 'Invalid question' using errcode='22023'; end if;
 -- Serialize retries for a client-generated request ID without a global lock.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 select * into existing from public.question_threads where id=p_id;
 if found then
 if existing.student_id=auth.uid() and existing.title=btrim(p_title) and existing.body=btrim(p_body)
 then return existing.id; end if;
 raise exception 'Invalid request' using errcode='42501'; end if;
 if p_visibility='teacher' then
 select a.id into assignment from public.teacher_assignments a
 where a.student_id=auth.uid() and a.status='approved'
 and muleum_private.has_role('teacher',a.teacher_id) for share;
 if assignment is null then raise exception 'Approved teacher required' using errcode='42501'; end if;
 end if;
 insert into public.question_threads(id,student_id,assignment_id,title,body,visibility)
 values(p_id,auth.uid(),assignment,btrim(p_title),btrim(p_body),p_visibility);
 return p_id;
end $$;

create function public.update_question(p_thread uuid,p_version integer,p_action text,p_value text default '')
returns void language plpgsql security definer set search_path='' as $$
declare q public.question_threads; assignment uuid; is_owner boolean;
begin
 select * into q from public.question_threads where id=p_thread for update;
 if not found or not muleum_private.can_read_question(p_thread) then
 raise exception 'Unavailable question' using errcode='42501'; end if;
 -- A business conflict must not request PostgREST transaction retries (40001).
 if p_version is distinct from q.version then raise exception 'Question changed; reload' using errcode='PT409'; end if;
 is_owner := q.student_id=auth.uid();
 if is_owner and not muleum_private.question_student() then raise exception 'Forbidden' using errcode='42501'; end if;
 -- Recheck the pinned relationship under a lock before any teacher write.
 if not is_owner then
 perform 1 from public.teacher_assignments where id=q.assignment_id and status='approved' for share;
 if not found or not muleum_private.can_read_question(p_thread) then raise exception 'Forbidden' using errcode='42501'; end if;
 end if;
 if p_action='message' then
 if q.status='resolved' or p_value is null or length(btrim(p_value)) not between 1 and 4000 then
 raise exception 'Invalid message' using errcode='22023'; end if;
 if is_owner and not exists(select 1 from public.question_messages where thread_id=q.id and kind='answer') then
 raise exception 'An answer is required before a follow-up' using errcode='22023'; end if;
 insert into public.question_messages(thread_id,author_id,kind,body,sequence)
 values(q.id,auth.uid(),case when is_owner then 'follow_up' else 'answer' end,btrim(p_value),q.version+1);
 update public.question_threads set status=case when is_owner then 'follow_up' else 'answered' end where id=q.id;
 elsif p_action='visibility' and is_owner then
 if p_value is null or p_value not in ('private','teacher') then raise exception 'Invalid visibility' using errcode='22023'; end if;
 if p_value='teacher' then
 select a.id into assignment from public.teacher_assignments a where a.student_id=auth.uid()
 and a.status='approved' and muleum_private.has_role('teacher',a.teacher_id) for share;
 if assignment is null then raise exception 'Approved teacher required' using errcode='42501'; end if;
 end if;
 update public.question_threads set visibility=p_value,assignment_id=assignment where id=q.id;
 elsif p_action='resolve' and is_owner then
 update public.question_threads set status='resolved' where id=q.id;
 elsif p_action='reopen' and is_owner and q.status='resolved' then
 update public.question_threads set status=case when exists(select 1 from public.question_messages where thread_id=q.id and kind='answer') then 'follow_up' else 'waiting' end where id=q.id;
 else raise exception 'Forbidden action' using errcode='42501';
 end if;
 update public.question_threads set version=version+1,updated_at=clock_timestamp() where id=q.id;
end $$;
revoke all on function muleum_private.question_student(),muleum_private.can_read_question(uuid),
 public.create_question(uuid,text,text,text),public.update_question(uuid,integer,text,text) from public,anon;
grant execute on function muleum_private.question_student(),muleum_private.can_read_question(uuid),
 public.create_question(uuid,text,text,text),public.update_question(uuid,integer,text,text) to authenticated;
commit;
