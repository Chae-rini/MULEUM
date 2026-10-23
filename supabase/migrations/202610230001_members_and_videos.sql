-- Local development migration. Auth must be configured invite-only before deployment.
begin;
create schema if not exists muleum_private;
revoke all on schema muleum_private from public;
grant usage on schema muleum_private to authenticated;

create table public.member_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'invited' check(status in ('invited','active','suspended')),
 enrollment text not null default 'none' check(enrollment in ('active','alumni','none')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.member_profiles (
 user_id uuid primary key references public.member_accounts on delete cascade,
 full_name text not null check(length(trim(full_name)) between 1 and 80),
 birth_date date not null,
 residence_region text not null check(length(trim(residence_region)) between 1 and 80),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.member_optional_profiles (
 user_id uuid primary key references public.member_accounts on delete cascade,
 gender text check(gender in ('male','female','other','prefer_not_to_say')),
 gender_description text check(length(gender_description)<=120),
 updated_at timestamptz not null default now(),
 check(gender_description is null or gender is not distinct from 'other')
);
create table public.member_roles (
 user_id uuid references public.member_accounts on delete cascade,
 role text check(role in ('student','parent','teacher','alumni','administrator','teaching_assistant','community_operator')),
 status text not null default 'pending' check(status in ('pending','approved','revoked')),
 approved_by uuid references auth.users on delete set null, updated_at timestamptz not null default now(),
 primary key(user_id,role)
);
create table public.guardian_links (
 student_id uuid references public.member_accounts on delete cascade,
 parent_id uuid references public.member_accounts on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','revoked')),
 verification_reference text, approved_by uuid references auth.users on delete set null,
 updated_at timestamptz not null default now(), primary key(student_id,parent_id), check(student_id<>parent_id)
);
create table public.teacher_assignments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.member_accounts on delete cascade,
 teacher_id uuid not null references public.member_accounts on delete cascade,
 status text not null check(status in ('approved','ended')), approved_by uuid references auth.users on delete set null,
 created_at timestamptz not null default now(), ended_at timestamptz, check(student_id<>teacher_id)
);
create unique index one_primary_teacher on public.teacher_assignments(student_id) where status='approved';
create index teacher_active_students on public.teacher_assignments(teacher_id) where status='approved';
create table public.member_invitations (
 id uuid primary key default gen_random_uuid(), token_hash text unique not null,
 invited_email text not null, requested_roles text[] not null,
 expires_at timestamptz not null, accepted_at timestamptz, revoked_at timestamptz,
 created_by uuid references auth.users on delete set null,
 check(requested_roles <@ array['student','parent','teacher','alumni','administrator','teaching_assistant','community_operator']::text[])
);
create table public.member_deletion_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.member_accounts on delete cascade,
 status text not null default 'requested' check(status in ('requested','reviewed','completed')),
 created_at timestamptz not null default now()
);
create table public.private_journals (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.member_accounts on delete cascade, body text not null);
create table public.private_questions (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.member_accounts on delete cascade, body text not null);
create table public.shared_learning_items (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.member_accounts on delete cascade,
 kind text not null check(kind in ('schedule','assignment','report')), title text not null, body text not null,
 parent_shared boolean not null default false, student_approved boolean not null default false, teacher_approved boolean not null default false
);
create table public.official_channel (
 singleton boolean primary key default true check(singleton), youtube_channel_id text unique,
 name text not null default 'MULEUM', verified_at timestamptz,
 check(youtube_channel_id is null or youtube_channel_id ~ '^UC[A-Za-z0-9_-]{22}$')
);
insert into public.official_channel(singleton) values(true);
create table public.education_videos (
 id uuid primary key default gen_random_uuid(), channel boolean not null default true references public.official_channel(singleton),
 youtube_video_id text not null unique check(youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
 title text not null check(length(trim(title)) between 1 and 160), description text not null default '' check(length(description)<=2000),
 category text not null check(category in ('복습','학습법','진로·삶','공개 Q&A','독서·토론','교육철학')),
 subject text not null, unit text not null, audience text not null,
 requested_visibility text not null check(requested_visibility in ('private','public')),
 upload_status text not null default 'pending' check(upload_status in ('pending','uploaded')),
 review_status text not null default 'draft' check(review_status in ('draft','submitted','approved')),
 observed_visibility text not null default 'unknown' check(observed_visibility in ('unknown','private','public','unlisted')),
 channel_verified boolean not null default false, observed_at timestamptz, observed_by uuid references auth.users on delete set null,
 approved_by uuid references auth.users on delete set null, approved_at timestamptz,
 is_fixture boolean not null default true,
 check(review_status<>'approved' or (approved_by is not null and approved_at is not null and channel_verified and observed_at is not null and requested_visibility=observed_visibility and upload_status='uploaded'))
);
create table public.video_creators (video_id uuid references public.education_videos on delete cascade, user_id uuid references public.member_accounts on delete cascade, primary key(video_id,user_id));
create table public.video_assignments (
 id uuid primary key default gen_random_uuid(), video_id uuid not null references public.education_videos on delete cascade,
 student_id uuid not null references public.member_accounts on delete cascade,
 status text not null default 'active' check(status in ('active','ended')),
 invitation_status text not null default 'pending' check(invitation_status in ('pending','confirmed','revoke_pending','revoked')),
 checked_at timestamptz, checked_by uuid references auth.users on delete set null,
 unique(video_id,student_id), check((status='active' and invitation_status in ('pending','confirmed')) or (status='ended' and invitation_status in ('revoke_pending','revoked')))
);
create table public.video_recipient_emails (
 assignment_id uuid primary key references public.video_assignments on delete cascade,
 google_email text not null check(google_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 verified_at timestamptz, verified_by uuid references auth.users on delete set null
);
create table public.permission_audit (
 id bigint generated always as identity primary key, actor_id uuid,
 action text not null, target_id text not null, created_at timestamptz not null default now()
);
create table muleum_private.capacity_lock(id integer primary key check(id=1), revision bigint not null default 0);
insert into muleum_private.capacity_lock(id) values(1);

create function muleum_private.active_member(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.member_accounts where user_id=p_id and status='active');
$$;
create function muleum_private.has_role(p_role text, p_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select muleum_private.active_member(p_id) and exists(select 1 from public.member_roles where user_id=p_id and role=p_role and status='approved');
$$;
create function muleum_private.is_guardian(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select muleum_private.has_role('parent') and exists(select 1 from public.guardian_links where student_id=p_student and parent_id=auth.uid() and status='approved');
$$;
create function muleum_private.is_teacher(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select muleum_private.has_role('teacher') and exists(select 1 from public.teacher_assignments where student_id=p_student and teacher_id=auth.uid() and status='approved');
$$;
create function muleum_private.is_creator(p_video uuid) returns boolean language sql stable security definer set search_path='' as $$
 select muleum_private.has_role('teacher') and exists(select 1 from public.video_creators where video_id=p_video and user_id=auth.uid());
$$;
create function muleum_private.can_read_video(p_video uuid) returns boolean language sql stable security definer set search_path='' as $$
 select muleum_private.has_role('administrator') or muleum_private.is_creator(p_video) or (
 muleum_private.has_role('student') and exists(select 1 from public.member_accounts where user_id=auth.uid() and enrollment='active') and exists(
 select 1 from public.video_assignments a join public.education_videos v on v.id=a.video_id
 where a.video_id=p_video and a.student_id=auth.uid() and a.status='active' and a.invitation_status in ('pending','confirmed')
 and v.review_status='approved' and v.requested_visibility='private' and v.observed_visibility='private' and v.channel_verified));
$$;
create function muleum_private.guard_profile() returns trigger language plpgsql set search_path='' as $$
begin
 if new.birth_date>(now() at time zone 'Asia/Seoul')::date then raise exception 'Future birth date'; end if;
 new.updated_at=now();
 if tg_op='UPDATE' then new.created_at=old.created_at; end if;
 return new;
end; $$;
create trigger profile_dates before insert or update on public.member_profiles for each row execute function muleum_private.guard_profile();
create function muleum_private.touch_optional_profile() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;
create trigger optional_profile_date before insert or update on public.member_optional_profiles for each row execute function muleum_private.touch_optional_profile();
create function public.my_age_category() returns text language sql stable security invoker set search_path='' as $$
 select case when extract(year from age((now() at time zone 'Asia/Seoul')::date,birth_date))>=19 then 'adult' else 'minor' end from public.member_profiles where user_id=auth.uid();
$$;
revoke all on function public.my_age_category() from public,anon;
grant execute on function public.my_age_category() to authenticated;
create function muleum_private.check_capacity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- A real row update serializes writers and causes serialization failures at stricter isolation levels.
 update muleum_private.capacity_lock set revision=revision+1 where id=1;
 if (select count(*) from public.member_roles r join public.member_accounts a using(user_id) where r.role='teacher' and r.status='approved' and a.status='active')>10 then raise exception 'Teacher capacity exceeded'; end if;
 if (select count(*) from public.member_accounts where status='active' and enrollment='active')>100 then raise exception 'Student capacity exceeded'; end if;
 if exists(select 1 from public.teacher_assignments t join public.member_accounts a on a.user_id=t.student_id where t.status='approved' and a.status='active' and a.enrollment='active' group by t.teacher_id having count(*)>10) then raise exception 'Per teacher capacity exceeded'; end if;
 return null;
end; $$;
create trigger account_capacity after insert or update on public.member_accounts for each statement execute function muleum_private.check_capacity();
create trigger role_capacity after insert or update on public.member_roles for each statement execute function muleum_private.check_capacity();
create trigger assignment_capacity after insert or update on public.teacher_assignments for each statement execute function muleum_private.check_capacity();
create function muleum_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.permission_audit(actor_id,action,target_id) values(auth.uid(),tg_table_name||':'||tg_op,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'user_id',to_jsonb(new)->>'student_id','record'));
 return new;
end; $$;
create trigger audit_roles after insert or update on public.member_roles for each row execute function muleum_private.audit_change();
create trigger audit_accounts after update on public.member_accounts for each row execute function muleum_private.audit_change();
create trigger audit_guardians after insert or update on public.guardian_links for each row execute function muleum_private.audit_change();
create trigger audit_teachers after insert or update on public.teacher_assignments for each row execute function muleum_private.audit_change();
create trigger audit_videos after insert or update on public.education_videos for each row execute function muleum_private.audit_change();
create trigger audit_video_access after insert or update on public.video_assignments for each row execute function muleum_private.audit_change();

-- No caller-supplied actor is accepted by privileged mutations.
create function public.manage_member(p_action text,p_user uuid,p_value text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 update muleum_private.capacity_lock set revision=revision+1 where id=1;
 if p_action='grant_role' then
 insert into public.member_roles(user_id,role,status,approved_by) values(p_user,p_value,'approved',auth.uid()) on conflict(user_id,role) do update set status='approved',approved_by=auth.uid(),updated_at=now();
 elsif p_action='revoke_role' then update public.member_roles set status='revoked',approved_by=auth.uid(),updated_at=now() where user_id=p_user and role=p_value;
 elsif p_action='graduate' then
 update public.member_accounts set enrollment='alumni',updated_at=now() where user_id=p_user;
 update public.member_roles set status='revoked',updated_at=now() where user_id=p_user and role='student';
 insert into public.member_roles(user_id,role,status,approved_by) values(p_user,'alumni','approved',auth.uid()) on conflict(user_id,role) do update set status='approved',approved_by=auth.uid();
 elsif p_action='suspend' then update public.member_accounts set status='suspended',updated_at=now() where user_id=p_user;
 else raise exception 'Unsupported action; activation requires verified onboarding'; end if;
 if p_action in ('graduate','suspend') then
 update public.teacher_assignments set status='ended',ended_at=now() where student_id=p_user and status='approved';
 update public.video_assignments set status='ended',invitation_status='revoke_pending',checked_at=null where student_id=p_user and invitation_status<>'revoked';
 end if;
end; $$;
create function public.set_guardian(p_student uuid,p_parent uuid,p_status text,p_evidence text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_status not in ('pending','approved','revoked') then raise exception 'Invalid status'; end if;
 if p_status='approved' and (not muleum_private.has_role('parent',p_parent) or not muleum_private.has_role('student',p_student) or nullif(trim(p_evidence),'') is null) then raise exception 'Verified relationship required'; end if;
 insert into public.guardian_links(student_id,parent_id,status,verification_reference,approved_by) values(p_student,p_parent,p_status,p_evidence,auth.uid()) on conflict(student_id,parent_id) do update set status=p_status,verification_reference=p_evidence,approved_by=auth.uid(),updated_at=now();
end; $$;
create function public.assign_teacher(p_student uuid,p_teacher uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 update muleum_private.capacity_lock set revision=revision+1 where id=1;
 if p_teacher is null then
 update public.teacher_assignments set status='ended',ended_at=now() where student_id=p_student and status='approved';
 return;
 end if;
 if not muleum_private.has_role('teacher',p_teacher) or not muleum_private.has_role('student',p_student) or not exists(select 1 from public.member_accounts where user_id=p_student and enrollment='active') then raise exception 'Active student and teacher required'; end if;
 update public.teacher_assignments set status='ended',ended_at=now() where student_id=p_student and status='approved';
 insert into public.teacher_assignments(student_id,teacher_id,status,approved_by) values(p_student,p_teacher,'approved',auth.uid());
end; $$;
create function public.related_student_summaries() returns table(student_id uuid,full_name text) language sql stable security definer set search_path='' as $$
 select p.user_id,p.full_name from public.member_profiles p where muleum_private.is_guardian(p.user_id) or muleum_private.is_teacher(p.user_id);
$$;
create function public.create_video(p_id text,p_title text,p_description text,p_category text,p_subject text,p_unit text,p_audience text,p_visibility text,p_creators uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not (muleum_private.has_role('teacher') or muleum_private.has_role('administrator')) then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_creators is null or not (auth.uid()=any(p_creators)) or exists(select 1 from unnest(p_creators) c where not (muleum_private.has_role('teacher',c) or muleum_private.has_role('administrator',c))) then raise exception 'Approved creators required'; end if;
 insert into public.education_videos(youtube_video_id,title,description,category,subject,unit,audience,requested_visibility) values(p_id,p_title,p_description,p_category,p_subject,p_unit,p_audience,p_visibility) returning id into result;
 insert into public.video_creators(video_id,user_id) select result,c from (select distinct unnest(p_creators) c) q;
 return result;
end; $$;
create function public.review_video(p_video uuid,p_action text,p_observed text default 'unknown',p_channel_verified boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare v public.education_videos;
begin
 select * into v from public.education_videos where id=p_video for update;
 if not found then raise exception 'Video not found'; end if;
 if p_action in ('submit','mark_uploaded') then
 if not (muleum_private.is_creator(p_video) or muleum_private.has_role('administrator')) then raise exception 'Forbidden' using errcode='42501'; end if;
 if v.review_status<>'draft' then raise exception 'Draft required'; end if;
 if p_action='mark_uploaded' then update public.education_videos set upload_status='uploaded' where id=p_video;
 else
 if v.upload_status<>'uploaded' then raise exception 'Upload completion required'; end if;
 update public.education_videos set review_status='submitted' where id=p_video;
 end if;
 else
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_action='observe' then
 update public.education_videos set observed_visibility=p_observed,channel_verified=p_channel_verified,observed_at=now(),observed_by=auth.uid(),review_status=case when p_observed=requested_visibility and p_channel_verified then review_status else 'submitted' end,approved_by=case when p_observed=requested_visibility and p_channel_verified then approved_by else null end,approved_at=case when p_observed=requested_visibility and p_channel_verified then approved_at else null end where id=p_video;
 elsif p_action='approve' then
 if v.review_status<>'submitted' or v.observed_visibility<>v.requested_visibility or not v.channel_verified or v.upload_status<>'uploaded' then raise exception 'Review and channel confirmation required'; end if;
 update public.education_videos set review_status='approved',approved_by=auth.uid(),approved_at=now() where id=p_video;
 else raise exception 'Unsupported action'; end if;
 end if;
end; $$;
create function public.assign_video(p_video uuid,p_student uuid,p_google_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 perform 1 from public.education_videos where id=p_video and review_status='approved' and requested_visibility='private' and observed_visibility='private' and channel_verified for update;
 if not found or not muleum_private.has_role('student',p_student) or not exists(select 1 from public.member_accounts where user_id=p_student and enrollment='active') then raise exception 'Approved private video and active student required'; end if;
 insert into public.video_assignments(video_id,student_id) values(p_video,p_student) returning id into result;
 insert into public.video_recipient_emails(assignment_id,google_email) values(result,p_google_email);
 return result;
end; $$;
create function public.confirm_video_access(p_assignment uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare a public.video_assignments;
begin
 if not muleum_private.has_role('administrator') then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into a from public.video_assignments where id=p_assignment for update;
 if not found then raise exception 'Assignment not found'; end if;
 if p_action='invite_confirm' and a.status='active' and a.invitation_status='pending' then
 update public.video_assignments set invitation_status='confirmed',checked_at=now(),checked_by=auth.uid() where id=p_assignment;
 update public.video_recipient_emails set verified_at=now(),verified_by=auth.uid() where assignment_id=p_assignment;
 elsif p_action='end_access' then update public.video_assignments set status='ended',invitation_status=case when invitation_status='revoked' then 'revoked' else 'revoke_pending' end,checked_at=now(),checked_by=auth.uid() where id=p_assignment;
 elsif p_action='revoke_confirm' and a.status='ended' and a.invitation_status='revoke_pending' then update public.video_assignments set invitation_status='revoked',checked_at=now(),checked_by=auth.uid() where id=p_assignment;
 else raise exception 'Invalid transition'; end if;
end; $$;
create function public.public_video_catalogue() returns table(youtube_video_id text,title text,description text,category text) language sql stable security definer set search_path='' as $$
 select v.youtube_video_id,v.title,v.description,v.category from public.education_videos v join public.official_channel c on c.singleton=v.channel
 where v.review_status='approved' and v.requested_visibility='public' and v.observed_visibility='public' and v.channel_verified and not v.is_fixture and c.verified_at is not null and c.youtube_channel_id is not null;
$$;

-- Deny by default; all mutations not granted below remain server-only.
do $$ declare t text; begin
 foreach t in array array['member_accounts','member_profiles','member_optional_profiles','member_roles','guardian_links','teacher_assignments','member_invitations','member_deletion_requests','private_journals','private_questions','shared_learning_items','official_channel','education_videos','video_creators','video_assignments','video_recipient_emails','permission_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
grant select on public.member_accounts,public.member_roles,public.teacher_assignments,public.guardian_links,public.permission_audit,public.education_videos,public.video_creators,public.video_assignments,public.video_recipient_emails,public.shared_learning_items,public.official_channel to authenticated;
grant select,insert,update on public.member_profiles,public.member_optional_profiles to authenticated;
grant select,insert,update,delete on public.private_journals,public.private_questions to authenticated;
grant select,insert on public.member_deletion_requests to authenticated;
create policy account_read on public.member_accounts for select to authenticated using(muleum_private.active_member(auth.uid()) and (user_id=auth.uid() or muleum_private.has_role('administrator')));
create policy roles_read on public.member_roles for select to authenticated using(muleum_private.active_member(auth.uid()) and (user_id=auth.uid() or muleum_private.has_role('administrator')));
create policy profile_own on public.member_profiles for all to authenticated using(user_id=auth.uid() and muleum_private.active_member(auth.uid())) with check(user_id=auth.uid() and muleum_private.active_member(auth.uid()));
create policy optional_own on public.member_optional_profiles for all to authenticated using(user_id=auth.uid() and muleum_private.active_member(auth.uid())) with check(user_id=auth.uid() and muleum_private.active_member(auth.uid()));
create policy guardian_read on public.guardian_links for select to authenticated using(muleum_private.has_role('administrator') or (muleum_private.active_member(auth.uid()) and (student_id=auth.uid() or parent_id=auth.uid())));
create policy teacher_read on public.teacher_assignments for select to authenticated using(muleum_private.has_role('administrator') or (muleum_private.active_member(auth.uid()) and (student_id=auth.uid() or teacher_id=auth.uid())));
create policy journal_own on public.private_journals for all to authenticated using(owner_id=auth.uid() and muleum_private.active_member(auth.uid())) with check(owner_id=auth.uid() and muleum_private.active_member(auth.uid()));
create policy question_own on public.private_questions for all to authenticated using(owner_id=auth.uid() and muleum_private.active_member(auth.uid())) with check(owner_id=auth.uid() and muleum_private.active_member(auth.uid()));
create policy shared_read on public.shared_learning_items for select to authenticated using((student_id=auth.uid() and muleum_private.active_member(auth.uid())) or muleum_private.is_teacher(student_id) or (muleum_private.is_guardian(student_id) and parent_shared and (kind<>'report' or (student_approved and teacher_approved))));
create policy deletion_read on public.member_deletion_requests for select to authenticated using(user_id=auth.uid() or muleum_private.has_role('administrator'));
create policy deletion_request on public.member_deletion_requests for insert to authenticated with check(user_id=auth.uid() and status='requested' and muleum_private.active_member(auth.uid()));
create policy audit_admin on public.permission_audit for select to authenticated using(muleum_private.has_role('administrator'));
create policy channel_read on public.official_channel for select to authenticated using(muleum_private.active_member(auth.uid()));
create policy video_read on public.education_videos for select to authenticated using(muleum_private.can_read_video(id));
create policy creators_read on public.video_creators for select to authenticated using(muleum_private.has_role('administrator') or muleum_private.is_creator(video_id));
create policy assignments_read on public.video_assignments for select to authenticated using(muleum_private.has_role('administrator') or (student_id=auth.uid() and muleum_private.active_member(auth.uid()) and status='active'));
create policy recipient_read on public.video_recipient_emails for select to authenticated using(muleum_private.has_role('administrator') or exists(select 1 from public.video_assignments a where a.id=assignment_id and a.student_id=auth.uid() and muleum_private.active_member(auth.uid())));
revoke all on all functions in schema muleum_private from public,anon,authenticated;
grant execute on function muleum_private.active_member(uuid),muleum_private.has_role(text,uuid),muleum_private.is_guardian(uuid),muleum_private.is_teacher(uuid),muleum_private.is_creator(uuid),muleum_private.can_read_video(uuid) to authenticated;
revoke all on function public.manage_member(text,uuid,text),public.set_guardian(uuid,uuid,text,text),public.assign_teacher(uuid,uuid),public.related_student_summaries(),public.create_video(text,text,text,text,text,text,text,text,uuid[]),public.review_video(uuid,text,text,boolean),public.assign_video(uuid,uuid,text),public.confirm_video_access(uuid,text),public.public_video_catalogue() from public,anon,authenticated;
grant execute on function public.manage_member(text,uuid,text),public.set_guardian(uuid,uuid,text,text),public.assign_teacher(uuid,uuid),public.related_student_summaries(),public.create_video(text,text,text,text,text,text,text,text,uuid[]),public.review_video(uuid,text,text,boolean),public.assign_video(uuid,uuid,text),public.confirm_video_access(uuid,text) to authenticated;
grant execute on function public.public_video_catalogue() to anon,authenticated;
commit;
