import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { OfflineSnackbar } from './components/OfflineSnackbar';
import { InstallPrompt } from './components/InstallPrompt';
import { setupForegroundListener, requestNotificationPermission } from './firebase/messaging';
import { db } from './firebase/config';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Activity } from 'lucide-react';

// Lazy load components for performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const MatchDetails = lazy(() => import('./pages/MatchDetails').then(module => ({ default: module.MatchDetails })));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then(module => ({ default: module.AdminLogin })));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const AdminEditMatch = lazy(() => import('./pages/admin/AdminEditMatch').then(module => ({ default: module.AdminEditMatch })));

const LoadingFallback = () => (
  <div className="flex justify-center items-center h-64">
    <Activity className="w-12 h-12 text-neon-blue animate-pulse" />
  </div>
);

function App() {
  useEffect(() => {
    // Request notification permission
    requestNotificationPermission();

    // Real-time notifications listener (Spark Plan Friendly)
    // We only listen for notifications added AFTER the app loads
    const initialLoadTime = new Date();
    const q = query(
      collection(db, 'notifications'), 
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // Only show if it's a new notification and permission is granted
          if (data.timestamp && data.timestamp.toDate() > initialLoadTime) {
            if (Notification.permission === 'granted') {
              new Notification(data.title, {
                body: data.body,
                icon: '/logo.png'
              });
            }
          }
        }
      });
    });

    // Setup foreground message listener for FCM (if configured)
    const unsubscribeFCM = setupForegroundListener((payload) => {
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/logo.png'
        });
      }
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeFCM();
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-dark-bg text-white font-sans antialiased relative">
          {/* Background Image Layer */}
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
            style={{ backgroundImage: "url('/dashboard.jpg')" }}
          />
          {/* Content Layer */}
          <div className="relative z-10">
            <Navbar />
            <main className="container mx-auto px-4 py-8 max-w-7xl">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/match/:id" element={<MatchDetails />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/admin/match/:id" element={<AdminEditMatch />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <OfflineSnackbar />
          <InstallPrompt />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
