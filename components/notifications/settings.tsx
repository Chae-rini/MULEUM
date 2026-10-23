'use client';
import { useEffect, useState } from 'react';
import type { AccountRole } from '@/lib/auth/policy';
import { allowedKinds, defaultPreferences, isQuiet, notificationLabels, validatePreferences, type NotificationKind, type NotificationPreferences } from '@/lib/notifications/model';
import { clearDeviceNotifications } from '@/components/pwa/logout-button';

const timeString=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
const minutes=(value:string)=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
export function NotificationSettings({ accountId, roles }: { accountId:string; roles:AccountRole[] }) {
  const [settings,setSettings]=useState<NotificationPreferences>(defaultPreferences);
  const [message,setMessage]=useState('');
  const [permission,setPermission]=useState<string>('확인 중');
  const [preview,setPreview]=useState<NotificationKind>('notice');
  const [previewText,setPreviewText]=useState('');
  const [busy,setBusy]=useState(false);
  const [supported,setSupported]=useState(false);
  const [requiresInstall,setRequiresInstall]=useState(false);
  const storageKey=`muleum:notification-preview:${accountId}`;
  const kinds=allowedKinds(roles);
  useEffect(()=>{
    setSupported(window.isSecureContext&&'Notification' in window&&'serviceWorker' in navigator);
    setPermission('Notification' in window?Notification.permission:'지원하지 않음');
    const appleMobile=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const standalone=matchMedia('(display-mode: standalone)').matches||(navigator as Navigator & {standalone?:boolean}).standalone===true;
    setRequiresInstall(appleMobile&&!standalone);
    try { const stored=sessionStorage.getItem(storageKey);if(stored)setSettings(validatePreferences(JSON.parse(stored))); }
    catch { setMessage('가상 설정을 불러오지 못했어요. 기본 설정으로 시작해요.'); }
    const changed=()=>setMessage('기기 구독이 변경됐어요. 다시 로그인한 뒤 알림 설정을 확인해 주세요.');
    const listener=(event:MessageEvent)=>{if(event.data?.type==='MULEUM_SUBSCRIPTION_CHANGED')changed();};
    navigator.serviceWorker?.addEventListener('message',listener);
    return ()=>navigator.serviceWorker?.removeEventListener('message',listener);
  },[storageKey]);
  function save() {
    try {
      const checked=validatePreferences({...settings,kinds:settings.kinds.filter(kind=>kinds.includes(kind))});
      sessionStorage.setItem(storageKey,JSON.stringify(checked));setSettings(checked);setMessage('가상 설정을 이 탭에 저장했어요. 서버 구독이나 실제 예약 발송은 활성화되지 않아요.');
    } catch { setMessage('저장하지 못했어요. 시간 입력과 브라우저 저장소 허용을 확인해 주세요.'); }
  }
  function chooseKind(kind:NotificationKind, checked:boolean) {
    setSettings({...settings,kinds:checked?[...settings.kinds,kind]:settings.kinds.filter(item=>item!==kind),...(kind==='diary'&&checked?{diaryMinute:settings.diaryMinute??1200}:{})});
  }
  async function permissionRequest() {
    if(!supported||requiresInstall)return;
    try { setPermission(await Notification.requestPermission()); }
    catch { setMessage('기기에서 권한을 요청하지 못했어요. 브라우저 설정을 확인해 주세요.'); }
  }
  async function localTest() {
    try { validatePreferences(settings); }
    catch { setMessage('시간 입력을 확인해 주세요. 테스트 알림을 표시하지 않았어요.'); return; }
    if(Notification.permission!=='granted'||!settings.enabled||!settings.kinds.includes(preview))return;
    if(isQuiet(settings,new Date())){setMessage('지금은 조용한 시간대예요. 기기 테스트 알림을 표시하지 않았어요.');return;}
    setBusy(true);
    try {
      const registration=await navigator.serviceWorker.getRegistration('/');
      if(!registration?.active)throw new Error('Service worker unavailable');
      registration.active.postMessage({type:'MULEUM_PREVIEW',kind:preview});
      setMessage('이 기기에 테스트 알림 표시를 요청했어요. 외부 푸시를 발송한 것은 아니에요.');
    } catch {setMessage('서비스 워커를 확인하지 못했어요. 새로고침 후 다시 시도해 주세요.');}
    finally {setBusy(false);}
  }
  return <div className="stack">
    <section className="card"><h2>알림 설정 · 가상 체험</h2><p className="note">실제 회원 구독·푸시 서버·예약 발송은 아직 연결되지 않았어요. 아래 설정은 이 브라우저 탭에서만 저장되며 로그아웃하면 지워져요.</p>
      <label className="check-row"><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})} />가상 알림 설정 켜기</label>
      <fieldset className="auth-fields" disabled={!settings.enabled}><legend className="mt-4">받고 싶은 알림</legend>
        {kinds.map(kind=><label className="check-row" key={kind}><input type="checkbox" checked={settings.kinds.includes(kind)} onChange={e=>chooseKind(kind,e.target.checked)} />{notificationLabels[kind]}</label>)}
        {settings.kinds.includes('diary')&&<div className="field mt-4"><label htmlFor="diary-time">일기 알림 시각 · 선택</label><input id="diary-time" type="time" value={timeString(settings.diaryMinute??1200)} onChange={e=>setSettings({...settings,diaryMinute:minutes(e.target.value)})} /><p className="hint">선택한 경우에만 사용해요. 일기 내용·작성 여부는 확인하지 않아요. 지금은 실제 예약되지 않아요.</p></div>}
        <div className="form-grid mt-4"><div className="field"><label htmlFor="quiet-start">조용한 시간 시작</label><input id="quiet-start" type="time" value={timeString(settings.quietStart)} onChange={e=>setSettings({...settings,quietStart:minutes(e.target.value)})} /></div><div className="field"><label htmlFor="quiet-end">조용한 시간 종료</label><input id="quiet-end" type="time" value={timeString(settings.quietEnd)} onChange={e=>setSettings({...settings,quietEnd:minutes(e.target.value)})} /></div></div>
        <div className="field"><label htmlFor="notification-zone">알림 시간대</label><select id="notification-zone" value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}><option value="Asia/Seoul">한국 · Asia/Seoul</option><option value="UTC">UTC</option><option value="America/New_York">뉴욕 · America/New_York</option></select><span className="hint">시작·종료가 같으면 조용한 시간대를 사용하지 않아요.</span></div>
      </fieldset><button className="button mt-4" onClick={save}>가상 설정 저장</button>
    </section>
    <section className="card"><h2>알림 미리보기</h2><div className="field"><label htmlFor="preview-kind">미리 볼 알림 종류</label><select id="preview-kind" value={preview} onChange={e=>setPreview(e.target.value as NotificationKind)}>{kinds.map(kind=><option key={kind} value={kind}>{notificationLabels[kind]}</option>)}</select></div>
      <button className="button line" onClick={()=>setPreviewText(settings.enabled&&settings.kinds.includes(preview)?'물음 — 새로운 소식이 있어요. 로그인 후 확인해 주세요.':'이 종류의 알림은 꺼져 있어요.')}>화면에서 미리보기</button>
      {previewText&&<p className="note mt-4" data-testid="notification-preview">{previewText}</p>}
      <p className="small mt-4">잠금 화면에는 이름·질문 제목·본문·일기 내용이 표시되지 않도록 설계했어요.</p>
    </section>
    <section className="card"><h2>기기 권한과 테스트</h2><p>브라우저 알림 권한: <strong>{permission}</strong></p>
      {requiresInstall&&<p className="notice warning">iPhone·iPad에서는 먼저 홈 화면에 추가하고, 추가한 아이콘으로 열어 주세요.</p>}
      {!supported&&<p className="small">현재 환경에서는 기기 알림 테스트를 지원하지 않아요. HTTPS 또는 로컬 개발 환경과 지원 브라우저가 필요해요.</p>}
      <div className="action-row"><button className="button line" disabled={!supported||requiresInstall||permission!=='default'} onClick={permissionRequest}>기기 알림 권한 요청</button><button className="button line" disabled={!supported||requiresInstall||permission!=='granted'||!settings.enabled||!settings.kinds.includes(preview)||busy} onClick={localTest}>이 기기에 테스트 알림</button></div>
      <p className="small mt-4">권한 허용만으로 실제 푸시 구독을 만들지 않아요. 거부한 권한은 기기 또는 브라우저 설정에서 변경해 주세요.</p>
      <button className="button line" onClick={async()=>{
        setSettings({...settings,enabled:false});setPreviewText('');
        try {sessionStorage.removeItem(storageKey);await clearDeviceNotifications();setMessage('이 기기의 구독·표시된 알림과 가상 설정을 해제했어요. 브라우저 권한 자체는 기기 설정에서 꺼 주세요.');}
        catch {setMessage('일부 해제를 확인하지 못했어요. 기기 설정에서 물음의 알림을 꺼 주세요.');}
      }}>이 기기 알림 끄기</button>
    </section>
    {message&&<p className="notice" role="status">{message}</p>}
  </div>;
}
