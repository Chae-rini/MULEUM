import { requireIdentity } from '@/lib/auth/server';
import { AuthenticatedShell } from '@/components/authenticated-shell';
import { Heading } from '@/components/ui';
import { InstallHelp } from '@/components/pwa/install-help';
import { NotificationSettings } from '@/components/notifications/settings';

export const metadata={title:'설치와 알림 설정 | 물음',robots:{index:false,follow:false}};
export default async function NotificationsPage() {
  const identity=await requireIdentity();
  return <AuthenticatedShell identity={identity} current="notifications">
    <Heading eyebrow="APP & NOTIFICATIONS" title="설치와 알림 설정" description="필요한 소식만, 내가 선택한 방식으로 받아요." />
    <div className="content-grid"><NotificationSettings accountId={identity.id} roles={identity.roles} /><InstallHelp /></div>
  </AuthenticatedShell>;
}
