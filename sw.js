
// Service Worker para Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado.');
  self.skipWaiting(); // Força o SW a se tornar ativo
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Recebido.');
  
  // Tenta parsear os dados da notificação.
  // O payload é enviado como JSON string da nossa Edge Function.
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Erro ao parsear dados do push:', e);
    // Fallback se não vier JSON
    data = {
      title: 'Nova Notificação',
      body: event.data.text(),
      icon: '/logo192.png',
      data: { url: '/' }
    };
  }
  
  const { title, body, icon, data: notificationData } = data;

  const options = {
    body: body,
    icon: icon, // Ícone que aparece na notificação
    badge: '/logo192.png', // Ícone pequeno na barra de status (Android)
    vibrate: [200, 100, 200], // Padrão de vibração
    data: {
      url: notificationData.url, // URL para abrir ao clicar
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Clique na notificação recebido.');

  event.notification.close();

  const urlToOpen = event.notification.data.url;

  // Procura por uma aba já aberta com a mesma URL.
  // Se encontrar, foca nela. Se não, abre uma nova.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
