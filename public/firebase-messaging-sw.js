importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// Note: These should match your web app's Firebase config.
firebase.initializeApp({
  apiKey: "AIzaSyAWRnGAHTww-4QCLkv40l8Wmn1lCxvO-hE", // In a real app, inject these dynamically or hardcode for your specific project
  authDomain: "crick-73a60.firebaseapp.com",
  projectId: "crick-73a60",
  storageBucket: "crick-73a60.firebasestorage.app",
  messagingSenderId: "797757568453",
  appId: "1:797757568453:web:c4978d65ef8c5734c947ac"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'CricNexa Update';
  const notificationOptions = {
    body: payload.notification?.body || 'New match event!',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
