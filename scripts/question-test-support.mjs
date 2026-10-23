import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const fixtureId = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export async function questionDatabase(modulePath, dataDir) {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = await PGlite.create(dataDir);
  await db.exec("create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;");
  for (const file of ['supabase/migrations/202610230001_members_and_videos.sql','supabase/seed.sql','supabase/migrations/202610230002_question_threads.sql']) {
    await db.exec(await readFile(new URL(`../${file}`,import.meta.url),'utf8'));
  }
  await db.query('insert into auth.users values($1)',[fixtureId(9)]);
  await db.query("insert into public.member_accounts(user_id,status) values($1,'active')",[fixtureId(9)]);
  await db.query("insert into public.member_roles(user_id,role,status) values($1,'teacher','approved')",[fixtureId(9)]);
  // Fixture setup runs as the database owner, never against an external DB.
  await db.query("insert into public.teacher_assignments(student_id,teacher_id,status) values($1,$2,'approved')",[fixtureId(2),fixtureId(9)]);
  return db;
}
export async function asMember(db, member, callback) {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[member ? fixtureId(member) : '']);
    await tx.exec(member ? 'set local role authenticated' : 'set local role anon');
    return callback(tx);
  });
}
