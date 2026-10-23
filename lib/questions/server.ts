import 'server-only';
import { cookies } from 'next/headers';
import { authCookie, requireIdentity } from '@/lib/auth/server';
import { authConfig } from '@/lib/auth/supabase';
import { canUseQuestions } from './model';
import { questionClient } from './client';

export async function questionContext() {
  const identity = await requireIdentity();
  const config = authConfig(process.env);
  const token = (await cookies()).get(authCookie)?.value;
  if (!canUseQuestions(identity) || !config || !token) return { identity, client: null };
  return { identity, client: questionClient(config, token) };
}
