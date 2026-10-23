'use client';
import { useState } from 'react';
import { logout } from '@/app/login/actions';

export async function clearDeviceNotifications() {
  if(!('serviceWorker' in navigator)) return;
  const registration=await navigator.serviceWorker.getRegistration('/');
  if(!registration) return;
  const subscription=await registration.pushManager?.getSubscription();
  if(subscription && !(await subscription.unsubscribe()))throw new Error('Unsubscribe failed');
  if ('Notification' in window && Notification.permission === 'granted') {
    for(const notification of await registration.getNotifications())notification.close();
  }
}
export function LogoutButton() {
  const [pending,setPending]=useState(false);
  return <form action={async()=>{
    setPending(true);
    let deviceFailed=false;
    try { await clearDeviceNotifications(); } catch { deviceFailed=true; }
    try { for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith('muleum:notification-preview:'))sessionStorage.removeItem(key);} } catch { /* Storage denial must not prevent logout. */ }
    await logout(deviceFailed);
  }}><button className="button line" disabled={pending}>{pending?'로그아웃 중…':'로그아웃'}</button></form>;
}
