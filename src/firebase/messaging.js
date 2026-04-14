import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './config';

let messaging;

// Messaging might not be supported in some browsers (like older Safari)
try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('Firebase Messaging not supported:', error);
}

export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Manually register the service worker from the subfolder for GitHub Pages
      const swUrl = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
      const registration = await navigator.serviceWorker.register(swUrl);
      
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BHs_wnOhh7d9_o4-jXflUScmwj9-U8r9IdLf5LuDselrw07mMvkktoKqwQOyewzkPtbec86K1WYqZ_6C3MdFPAI',
        serviceWorkerRegistration: registration
      });
      console.log('FCM Token generated:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

export const setupForegroundListener = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
};
