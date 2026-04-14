import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { motion, AnimatePresence } from 'framer-motion';

export const InstallPrompt = () => {
  const { isInstallable, installPWA } = usePWAInstall();

  return (
    <AnimatePresence>
      {isInstallable && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 glass px-6 py-4 rounded-2xl border border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.3)] flex flex-col gap-3 max-w-sm"
        >
          <div className="flex justify-between items-center gap-4">
            <div>
              <h3 className="text-white font-bold">Install CricNexa 🚀</h3>
              <p className="text-xs text-gray-400">Get offline access and notifications</p>
            </div>
            <button
              onClick={installPWA}
              className="bg-gradient-to-r from-neon-blue to-blue-600 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <Download className="w-4 h-4" />
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
