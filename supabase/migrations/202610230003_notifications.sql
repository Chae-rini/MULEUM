-- Development schema only. No network sender, cron job or automatic opt-in.
begin;
create table public.notification_settings (
 user_id uuid primary key references public.member_accounts on delete cascade,
 enabled boolean not null default false,
 kinds text[] not null default '{}',
 timezone text not null default 'Asia/Seoul',
 quiet_start integer not null default 1320 check(quiet_start between 0 and 1439),
 quiet_end integer not null default 480 check(quiet_end between 0 and 1439),
 diary_minute integer check(diary_minute between 0 and 1439),
 updated_at timestamptz not null default now(),
 check(kinds <@ array['question_answer','student_question','lesson_reminder','schedule_changed','notice','diary']::text[]),
 check(not ('diary'=any(kinds)) or diary_minute is not null)
);
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.member_accounts on delete cascade,
 endpoint text not null unique, p256dh text not null, auth_secret text not null,
 consent_at timestamptz not null default now(), revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index push_subscriptions_owner on public.push_subscriptions(user_id) where revoked_at is null;
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.member_accounts on delete cascade,
 kind text not null check(kind in ('question_answer','student_question','lesson_reminder','schedule_changed','notice','diary')),
 resource_id uuid, event_key text not null unique,
 not_before timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '1 day'),
 status text not null default 'pending' check(status in ('pending','sent','cancelled')),
 created_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_outbox enable row level security;
revoke all on public.notification_settings,public.push_subscriptions,public.notification_outbox from public,anon,authenticated;
grant select on public.notification_settings to authenticated;
grant select(id,user_id,consent_at,revoked_at,created_at) on public.push_subscriptions to authenticated;
create policy notification_settings_own on public.notification_settings for select to authenticated
 using(user_id=auth.uid() and muleum_private.active_member(auth.uid()));
create policy push_subscription_own on public.push_subscriptions for select to authenticated
 using(user_id=auth.uid() and muleum_private.active_member(auth.uid()));
-- The outbox has no member-facing policy or write grant.

create function public.disable_my_push() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Forbidden' using errcode='42501'; end if;
 update public.notification_settings set enabled=false,updated_at=now() where user_id=auth.uid();
 update public.push_subscriptions set revoked_at=now() where user_id=auth.uid() and revoked_at is null;
 update public.notification_outbox set status='cancelled' where recipient_id=auth.uid() and status='pending';
end $$;
create function public.save_notification_settings(p_enabled boolean,p_kinds text[],p_timezone text,p_quiet_start integer,p_quiet_end integer,p_diary_minute integer default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not muleum_private.active_member(auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_enabled is null or p_kinds is null or array_position(p_kinds,null) is not null or p_timezone is null
 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone)
 or p_quiet_start is null or p_quiet_end is null then raise exception 'Invalid settings' using errcode='22023'; end if;
 insert into public.notification_settings(user_id,enabled,kinds,timezone,quiet_start,quiet_end,diary_minute)
 values(auth.uid(),p_enabled,p_kinds,p_timezone,p_quiet_start,p_quiet_end,p_diary_minute)
 on conflict(user_id) do update set enabled=excluded.enabled,kinds=excluded.kinds,timezone=excluded.timezone,
 quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end,diary_minute=excluded.diary_minute,updated_at=now();
 if not p_enabled then perform public.disable_my_push(); end if;
end $$;
create function public.register_push_subscription(p_endpoint text,p_p256dh text,p_auth text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; owner_id uuid;
begin
 if not muleum_private.active_member(auth.uid()) or not exists(select 1 from public.notification_settings where user_id=auth.uid() and enabled)
 then raise exception 'Explicit consent required' using errcode='42501'; end if;
 -- Exact hosts only: the future sender must also reject redirects and revalidate DNS.
 if p_endpoint is null or length(p_endpoint)>2048 or p_endpoint !~ '^https://(fcm\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com)/[A-Za-z0-9_/?=&.%:+~-]+$'
 or p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{87}$'
 or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{22}$' then raise exception 'Invalid subscription' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_endpoint,0));
 select user_id into owner_id from public.push_subscriptions where endpoint=p_endpoint;
 if found and owner_id<>auth.uid() then raise exception 'Subscription already bound' using errcode='42501'; end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_secret) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth_secret=excluded.auth_secret,consent_at=now(),revoked_at=null
 returning id into result;
 return result;
end $$;

create function muleum_private.notification_authorized(p_user uuid,p_kind text,p_resource uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select muleum_private.active_member(p_user) and case
 when p_kind='question_answer' then muleum_private.has_role('student',p_user) and exists(
 select 1 from public.question_threads q where q.id=p_resource and q.student_id=p_user
 and exists(select 1 from public.question_messages m where m.thread_id=q.id and m.kind='answer'))
 when p_kind='student_question' then muleum_private.has_role('teacher',p_user) and exists(
 select 1 from public.question_threads q join public.teacher_assignments a on a.id=q.assignment_id
 join public.member_accounts s on s.user_id=q.student_id
 where q.id=p_resource and q.visibility='teacher' and a.teacher_id=p_user and a.student_id=q.student_id
 and a.status='approved' and s.status='active' and s.enrollment='active' and muleum_private.has_role('student',q.student_id))
 when p_kind in ('lesson_reminder','schedule_changed') then exists(
 select 1 from public.shared_learning_items l join public.member_accounts s on s.user_id=l.student_id
 where l.id=p_resource and l.kind='schedule' and s.status='active' and (
 (l.student_id=p_user and muleum_private.has_role('student',p_user)) or
 (muleum_private.has_role('teacher',p_user) and exists(select 1 from public.teacher_assignments a where a.student_id=l.student_id and a.teacher_id=p_user and a.status='approved')) or
 (muleum_private.has_role('parent',p_user) and l.parent_shared and l.student_approved and l.teacher_approved
 and exists(select 1 from public.guardian_links g where g.student_id=l.student_id and g.parent_id=p_user and g.status='approved'))))
 when p_kind='diary' then p_resource=p_user and muleum_private.has_role('student',p_user)
 -- Real notices have no authoritative published-audience table yet. Fail closed.
 else false end;
$$;
create function muleum_private.notification_ready(p_job uuid,p_now timestamptz default now())
returns boolean language plpgsql stable security definer set search_path='' as $$
declare j public.notification_outbox; p public.notification_settings; minute integer;
begin
 if p_now is null then return false; end if;
 select * into j from public.notification_outbox where id=p_job;
 if not found or j.status<>'pending' or j.not_before>p_now or j.expires_at<=p_now
 or not muleum_private.notification_authorized(j.recipient_id,j.kind,j.resource_id) then return false; end if;
 select * into p from public.notification_settings where user_id=j.recipient_id;
 if not found or not p.enabled or not(j.kind=any(p.kinds)) then return false; end if;
 minute := extract(hour from p_now at time zone p.timezone)::integer*60+extract(minute from p_now at time zone p.timezone)::integer;
 if p.quiet_start<p.quiet_end and minute>=p.quiet_start and minute<p.quiet_end then return false; end if;
 if p.quiet_start>p.quiet_end and (minute>=p.quiet_start or minute<p.quiet_end) then return false; end if;
 if j.kind='diary' and minute is distinct from p.diary_minute then return false; end if;
 return exists(select 1 from public.push_subscriptions where user_id=j.recipient_id and revoked_at is null);
end $$;
create function muleum_private.invalidate_push() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if tg_op='DELETE' then target:=old.user_id; else target:=new.user_id; end if;
 update public.push_subscriptions set revoked_at=now() where user_id=target and revoked_at is null;
 update public.notification_settings set enabled=false,updated_at=now() where user_id=target;
 update public.notification_outbox set status='cancelled' where recipient_id=target and status='pending';
 return null;
end $$;
create trigger push_role_change after insert or update or delete on public.member_roles for each row execute function muleum_private.invalidate_push();
create trigger push_account_change after update of status,enrollment on public.member_accounts for each row execute function muleum_private.invalidate_push();
revoke all on function public.disable_my_push(),public.save_notification_settings(boolean,text[],text,integer,integer,integer),public.register_push_subscription(text,text,text) from public,anon;
grant execute on function public.disable_my_push(),public.save_notification_settings(boolean,text[],text,integer,integer,integer),public.register_push_subscription(text,text,text) to authenticated;
revoke all on function muleum_private.notification_authorized(uuid,text,uuid),muleum_private.notification_ready(uuid,timestamptz),muleum_private.invalidate_push() from public,anon,authenticated;
commit;
