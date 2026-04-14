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
      // Typically you'd have a VAPID key here from Firebase Console > Project Settings > Cloud Messaging > Web Push certs
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BHs_wnOhh7d9_o4-jXflUScmwj9-U8r9IdLf5LuDselrw07mMvkktoKqwQOyewzkPtbec86K1WYqZ_6C3MdFPAI'
      });
      console.log('FCM Token generated:', token);
      // You would normally send this token to your backend/firestore to save it against the user
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
