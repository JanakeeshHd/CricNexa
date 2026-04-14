import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineSnackbar = () => {
  const isOnline = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500/90 text-white px-4 py-3 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-400 flex items-center gap-3"
        >
          <WifiOff className="w-5 h-5" />
          <span className="font-medium text-sm whitespace-nowrap">⚠️ You are offline. Showing cached data.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
