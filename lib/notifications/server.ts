import 'server-only';
import type { AuthConfig } from '@/lib/auth/supabase';

// Never enable live sending merely because keys happen to exist in an environment.
export const livePushEnabled = false;
export async function revokeAllSubscriptions(config:AuthConfig, token:string) {
  const response=await fetch(`${config.url}/rest/v1/rpc/disable_my_push`,{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
    headers:{apikey:config.key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}',
  });
  if(!response.ok)throw new Error('Push revocation failed');
}
