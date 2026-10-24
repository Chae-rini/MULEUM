-- Members may edit only their name and region; birth date (age and guardian rules) and ownership stay server-controlled.
-- Profiles are created only by the security definer function complete_onboarding, so members need no direct insert.
-- Revoking the table-level privilege also clears column privileges, so the column grant comes after it.
revoke insert, update on public.member_profiles from authenticated;
grant update (full_name, residence_region) on public.member_profiles to authenticated;
