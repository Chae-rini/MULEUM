-- Fictional local fixtures only. Never run against a hosted project.
insert into auth.users(id) select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,8) i;
insert into public.member_accounts(user_id,status,enrollment) select id,'active',case right(id::text,1) when '1' then 'active' when '2' then 'active' when '6' then 'alumni' else 'none' end from auth.users where id::text like '00000000-0000-4000-8000-%';
insert into public.member_profiles(user_id,full_name,birth_date,residence_region) select user_id,'Fictional member '||right(user_id::text,1),date '2010-05-20','Fictional district' from public.member_accounts;
insert into public.member_roles(user_id,role,status) select user_id,case right(user_id::text,1) when '1' then 'student' when '2' then 'student' when '3' then 'teacher' when '4' then 'parent' when '5' then 'administrator' when '6' then 'alumni' when '7' then 'teaching_assistant' else 'community_operator' end,'approved' from public.member_accounts;
insert into public.member_optional_profiles(user_id,gender,gender_description) values('00000000-0000-4000-8000-000000000001','other','PRIVATE_GENDER_SENTINEL');
insert into public.private_journals(owner_id,body) values('00000000-0000-4000-8000-000000000001','PRIVATE_DIARY_SENTINEL');
insert into public.private_questions(owner_id,body) values('00000000-0000-4000-8000-000000000001','PRIVATE_QUESTION_SENTINEL');
insert into public.guardian_links(student_id,parent_id,status,verification_reference) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','approved','fictional-check');
insert into public.teacher_assignments(student_id,teacher_id,status) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','approved');
insert into public.shared_learning_items(student_id,kind,title,body,parent_shared,student_approved,teacher_approved) values
 ('00000000-0000-4000-8000-000000000001','report','Approved example','Fictional summary',true,true,true),
 ('00000000-0000-4000-8000-000000000001','report','Unapproved draft','PRIVATE_REPORT_SENTINEL',true,false,true),
 ('00000000-0000-4000-8000-000000000002','schedule','Other student schedule','PRIVATE_SCHEDULE_SENTINEL',true,true,true);
