-- Invite link + Google sign-in. A Google login only creates an auth user; membership exists only after
-- an invitation bound to that Google email is accepted and first-login onboarding is completed.
-- Minors (under 19 in Korea) stay invited until an administrator records guardian consent.
begin;

alter table public.member_invitations
 add column teacher_id uuid references public.member_accounts on delete set null,
 add column accepted_by uuid references auth.users on delete set null,
 add column created_at timestamptz not null default now(),
 add constraint invitation_email_normalized check(invited_email=lower(btrim(invited_email)) and invited_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
 add constraint invitation_single_role check(cardinality(requested_roles)=1),
 add constraint invitation_hash_format check(token_hash ~ '^[0-9a-f]{64}$');
create unique index one_open_invitation_per_email on public.member_invitations(invited_email) where accepted_at is null and revoked_at is null;

create table public.member_onboarding (
 user_id uuid primary key references public.member_accounts on delete cascade,
 invitation_id uuid not null unique references public.member_invitations on delete restrict,
 completed_at timestamptz,
 privacy_consent_at timestamptz,
 guardian_consent_required boolean not null default false,
 guardian_consent_reference text check(guardian_consent_reference is null or length(btrim(guardian_consent_reference)) between 1 and 200),
 guardian_consent_at timestamptz,
 guardian_confirmed_by uuid references auth.users on delete set null,
 created_at timestamptz not null default now()
);
alter table public.member_onboarding enable row level security;
revoke all on public.member_onboarding from anon, authenticated;

create function muleum_private.age_on_seoul_today(p_birth date) returns integer language sql stable set search_path='' as $$
 select extract(year from age((now() at time zone 'Asia/Seoul')::date, p_birth))::integer;
$$;

create function muleum_private.activate_member(p_user uuid, p_actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_role text; v_teacher uuid;
begin
 select i.requested_roles[1], i.teacher_id into v_role, v_teacher
  from public.member_onboarding o join public.member_invitations i on i.id=o.invitation_id where o.user_id=p_user;
 update muleum_private.capacity_lock set revision=revision+1 where id=1;
 update public.member_accounts set status='active', updated_at=now() where user_id=p_user and status='invited';
 update public.member_roles set status='approved', approved_by=p_actor, updated_at=now() where user_id=p_user and status='pending';
 if v_role='student' and v_teacher is not null then
  if not muleum_private.has_role('teacher', v_teacher) then raise exception 'Assigned teacher is no longer active'; end if;
  insert into public.teacher_assignments(student_id,teacher_id,status,approved_by) values(p_user,v_teacher,'approved',p_actor);
 end if;
end; $$;

-- The raw token never reaches the database; the server stores only its SHA-256 hex digest.
create function public.create_invitation(p_email text, p_role text, p_teacher uuid, p_token_hash text, p_days integer) returns uuid language plpgsql security definer set search_path='' as $$
declare v_email text := lower(btrim(coalesce(p_email,''))); v_id uuid;
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_role is null or p_role not in ('student','parent','teacher','administrator') then raise exception 'Unsupported role'; end if;
 if p_days is null or p_days not between 1 and 14 then raise exception 'Invalid expiry'; end if;
 if p_role='student' then
  if p_teacher is null or not muleum_private.has_role('teacher', p_teacher) then raise exception 'Active teacher required'; end if;
 elsif p_teacher is not null then raise exception 'Teacher applies only to students'; end if;
 update public.member_invitations set revoked_at=now() where invited_email=v_email and accepted_at is null and revoked_at is null;
 insert into public.member_invitations(token_hash,invited_email,requested_roles,teacher_id,expires_at,created_by)
  values(p_token_hash,v_email,array[p_role],p_teacher,now()+make_interval(days=>p_days),auth.uid()) returning id into v_id;
 return v_id;
end; $$;

create function public.accept_invitation(p_token_hash text) returns text language plpgsql security definer set search_path='' as $$
declare v_inv public.member_invitations; v_email text := lower(btrim(coalesce(auth.jwt()->>'email','')));
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if coalesce(auth.jwt()->'app_metadata'->>'provider','')<>'google' then raise exception 'Google sign-in required' using errcode='MUL06'; end if;
 select * into v_inv from public.member_invitations where token_hash=p_token_hash for update;
 if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at<=now() then raise exception 'Invitation unavailable' using errcode='MUL02'; end if;
 if v_inv.invited_email<>v_email then raise exception 'Invitation email mismatch' using errcode='MUL01'; end if;
 if exists(select 1 from public.member_accounts where user_id=auth.uid()) then raise exception 'Already a member' using errcode='MUL03'; end if;
 insert into public.member_accounts(user_id,status,enrollment) values(auth.uid(),'invited',case when v_inv.requested_roles[1]='student' then 'active' else 'none' end);
 insert into public.member_roles(user_id,role,status) values(auth.uid(),v_inv.requested_roles[1],'pending');
 insert into public.member_onboarding(user_id,invitation_id) values(auth.uid(),v_inv.id);
 update public.member_invitations set accepted_at=now(), accepted_by=auth.uid() where id=v_inv.id;
 return v_inv.requested_roles[1];
end; $$;

create function public.complete_onboarding(p_full_name text, p_birth_date date, p_region text, p_privacy_consent boolean) returns text language plpgsql security definer set search_path='' as $$
declare v_onboarding public.member_onboarding; v_age integer; v_actor uuid;
begin
 select * into v_onboarding from public.member_onboarding where user_id=auth.uid() for update;
 if not found or v_onboarding.completed_at is not null or not exists(select 1 from public.member_accounts where user_id=auth.uid() and status='invited') then
  raise exception 'Onboarding unavailable' using errcode='MUL02';
 end if;
 if p_privacy_consent is not true then raise exception 'Consent required' using errcode='MUL04'; end if;
 if p_birth_date is null then raise exception 'Birth date required'; end if;
 v_age := muleum_private.age_on_seoul_today(p_birth_date);
 if v_age<15 then raise exception 'Minimum age is 15' using errcode='MUL05'; end if;
 insert into public.member_profiles(user_id,full_name,birth_date,residence_region) values(auth.uid(),btrim(p_full_name),p_birth_date,btrim(p_region));
 update public.member_onboarding set completed_at=now(), privacy_consent_at=now(), guardian_consent_required=(v_age<19) where user_id=auth.uid();
 if v_age>=19 then
  select created_by into v_actor from public.member_invitations where id=v_onboarding.invitation_id;
  perform muleum_private.activate_member(auth.uid(), v_actor);
  return 'active';
 end if;
 return 'waiting_guardian';
end; $$;

create function public.my_onboarding_status() returns text language sql stable security definer set search_path='' as $$
 select case
  when a.user_id is null then 'not_member'
  when a.status='active' then 'active'
  when a.status='suspended' then 'suspended'
  when o.completed_at is null then 'needs_profile'
  when o.guardian_consent_required and o.guardian_consent_at is null then 'waiting_guardian'
  else 'pending' end
 from (select auth.uid() as uid) me
 left join public.member_accounts a on a.user_id=me.uid
 left join public.member_onboarding o on o.user_id=me.uid;
$$;

create function public.pending_guardian_consents() returns table(user_id uuid, full_name text, age integer, invited_email text, role text, completed_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select o.user_id, p.full_name, muleum_private.age_on_seoul_today(p.birth_date), i.invited_email, i.requested_roles[1], o.completed_at
  from public.member_onboarding o join public.member_profiles p on p.user_id=o.user_id join public.member_invitations i on i.id=o.invitation_id
  where o.completed_at is not null and o.guardian_consent_required and o.guardian_consent_at is null
  order by o.completed_at;
end; $$;

create function public.confirm_guardian_consent(p_user uuid, p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 if nullif(btrim(coalesce(p_reference,'')),'') is null or length(btrim(p_reference))>200 then raise exception 'Consent reference required'; end if;
 update public.member_onboarding set guardian_consent_reference=btrim(p_reference), guardian_consent_at=now(), guardian_confirmed_by=auth.uid()
  where user_id=p_user and completed_at is not null and guardian_consent_required and guardian_consent_at is null;
 if not found then raise exception 'No pending consent' using errcode='MUL02'; end if;
 perform muleum_private.activate_member(p_user, auth.uid());
end; $$;

create function public.list_invitations() returns table(id uuid, invited_email text, role text, teacher_name text, expires_at timestamptz, accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select i.id, i.invited_email, i.requested_roles[1], p.full_name, i.expires_at, i.accepted_at, i.revoked_at, i.created_at
  from public.member_invitations i left join public.member_profiles p on p.user_id=i.teacher_id
  order by i.created_at desc limit 50;
end; $$;

create function public.revoke_invitation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 update public.member_invitations set revoked_at=now() where id=p_id and accepted_at is null and revoked_at is null;
 if not found then raise exception 'Invitation not open' using errcode='MUL02'; end if;
end; $$;

create function public.active_teachers() returns table(user_id uuid, full_name text) language plpgsql stable security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select r.user_id, p.full_name from public.member_roles r join public.member_profiles p on p.user_id=r.user_id
  where r.role='teacher' and muleum_private.has_role('teacher', r.user_id) order by p.full_name;
end; $$;

revoke all on function muleum_private.age_on_seoul_today(date), muleum_private.activate_member(uuid,uuid) from public, anon, authenticated;
revoke all on function public.create_invitation(text,text,uuid,text,integer), public.accept_invitation(text), public.complete_onboarding(text,date,text,boolean),
 public.my_onboarding_status(), public.pending_guardian_consents(), public.confirm_guardian_consent(uuid,text), public.list_invitations(),
 public.revoke_invitation(uuid), public.active_teachers() from public, anon, authenticated;
grant execute on function public.create_invitation(text,text,uuid,text,integer), public.accept_invitation(text), public.complete_onboarding(text,date,text,boolean),
 public.my_onboarding_status(), public.pending_guardian_consents(), public.confirm_guardian_consent(uuid,text), public.list_invitations(),
 public.revoke_invitation(uuid), public.active_teachers() to authenticated;
commit;
