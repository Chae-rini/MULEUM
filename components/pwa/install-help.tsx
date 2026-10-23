'use client';
import { useEffect, useState } from 'react';

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
export function InstallHelp() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    setInstalled(display.matches);
    const prompt = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const done = () => { setInstalled(true); setInstall(null); };
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('appinstalled', done); };
  }, []);
  return <section className="card"><h2>물음을 앱처럼 열기</h2>
    {installed ? <p className="notice success">앱 화면으로 실행 중이에요.</p> : <>
      <p>iPhone·iPad에서는 브라우저의 공유 메뉴에서 ‘홈 화면에 추가’를 선택한 뒤, 홈 화면의 물음 아이콘으로 열어 주세요. 메뉴 위치는 OS 버전에 따라 달라요.</p>
      <p className="small">Android·macOS에서는 브라우저의 앱 설치 또는 Dock에 추가 메뉴를 확인해 주세요. 설치 기능은 브라우저마다 달라요. 설치해도 인터넷 연결은 필요해요.</p>
      {install && <button className="button line" onClick={async () => { await install.prompt(); await install.userChoice; setInstall(null); }}>물음 설치하기</button>}
    </>}
    <p className="small">푸시는 별도 동의가 필요해요. iPhone·iPad는 iOS/iPadOS 16.4 이상에서 홈 화면 웹앱의 알림을 지원해요. 임시 공유 주소가 바뀌면 설치와 권한도 다시 설정해야 해요.</p>
  </section>;
}
