// FILE: src/components/Notifications/NotificationBell.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';

export const NotificationBell: React.FC = () => {
  const { unreadCount, notifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  // Shake effect when new notification arrives
  useEffect(() => {
    if (notifications.length > 0) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  return (
    <>
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(true)}
          animate={shouldShake ? {
            rotate: [0, -15, 15, -15, 15, 0],
            scale: [1, 1.15, 0.95, 1.15, 1]
          } : {}}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${unreadCount > 0 ? 'bg-emerald-50 text-brand-green ring-4 ring-emerald-50/50 shadow-lg shadow-emerald-200/50' : 'bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-900'}`}
        >
          <Bell size={22} className={unreadCount > 0 ? 'fill-brand-green animate-pulse' : ''} />
          
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -left-1.5 min-w-[22px] h-[22px] px-1 bg-rose-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-[10px] font-black text-white leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
