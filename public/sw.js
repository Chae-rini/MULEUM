/* No fetch interception or Cache Storage: private pages stay network-only. */
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const notificationBodies = {
  question_answer: '새로운 답변이 있어요. 로그인 후 확인해 주세요.',
  student_question: '새로운 질문이 있어요. 로그인 후 확인해 주세요.',
  lesson_reminder: '예정된 수업이 있어요. 로그인 후 확인해 주세요.',
  schedule_changed: '수업 일정이 변경됐어요. 로그인 후 확인해 주세요.',
  notice: '새로운 공지가 있어요. 로그인 후 확인해 주세요.',
  diary: '원한다면 잠시 나를 돌아보는 시간을 가져보세요.',
};

async function showSafeNotification(kind) {
  if (!Object.hasOwn(notificationBodies, kind)) return;
  await self.registration.showNotification('물음', {
    body: notificationBodies[kind], icon: '/brand/muleum-icon-sky-192.png',
    tag: `muleum-${kind}`,
    // Payload-supplied text, URLs and IDs are deliberately ignored.
    data: { url: '/member' },
  });
}
self.addEventListener('push', event => {
  let kind;
  try { kind = event.data?.json()?.kind; } catch { return; }
  event.waitUntil(showSafeNotification(kind));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Always re-enter authenticated routing; never open an arbitrary payload URL.
  event.waitUntil(self.clients.openWindow('/member'));
});
self.addEventListener('pushsubscriptionchange', event => {
  // Do not silently renew consent or bind a new endpoint to an unknown account.
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(clients => {
    for (const client of clients) client.postMessage({ type: 'MULEUM_SUBSCRIPTION_CHANGED' });
  }));
});
