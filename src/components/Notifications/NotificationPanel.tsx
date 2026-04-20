// FILE: src/components/Notifications/NotificationPanel.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCheck, Trash2, BellOff, RotateCcw } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '../../hooks/useNotifications';
import { useToast } from '../../hooks/useToast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');
  const { notifications, markAsRead, dismiss, markAllAsRead, clearAll } = useNotifications();
  const toast = useToast();

  const filteredNotifs = activeTab === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const handleClearAll = () => {
    // Save current for undo
    const current = [...notifications];
    clearAll();
    toast.action("تم مسح جميع الإشعارات", "تراجع", () => {
      // Re-add logic would need to be in hook/state, for simulation we just toast
      console.log("Reverting clear all...");
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[5000] bg-stone-900/10 backdrop-blur-[2px]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-[5001] border-r border-stone-100 flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-stone-900 flex items-center justify-center text-white">
                  <BellOff size={20} />
                </div>
                <h2 className="text-xl font-black text-stone-900 tracking-tight">الإشعارات</h2>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-center text-stone-400 hover:text-stone-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* Actions & Tabs */}
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-100 space-y-4">
              <div className="flex bg-white p-1 rounded-xl shadow-inner border border-stone-200">
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'unread' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-900'}`}
                >
                  غير مقروء ({notifications.filter(n => !n.read).length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'all' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-900'}`}
                >
                  الكل ({notifications.length})
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={markAllAsRead}
                  className="flex-1 py-2 px-3 bg-white border border-stone-200 rounded-xl text-[10px] font-black text-stone-600 hover:border-brand-green hover:text-brand-green transition-all flex items-center justify-center gap-2"
                >
                  <CheckCheck size={14} /> تعليم الكل كمقروء
                </button>
                <button 
                  onClick={handleClearAll}
                  className="py-2 px-3 bg-white border border-stone-200 rounded-xl text-[10px] font-black text-stone-400 hover:border-rose-500 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> مسح الكل
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout text-right">
                {filteredNotifs.length > 0 ? (
                  filteredNotifs.map(notif => (
                    <NotificationItem 
                      key={notif.id} 
                      notification={notif} 
                      onRead={markAsRead} 
                      onDismiss={dismiss} 
                    />
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center text-stone-200">
                      <BellOff size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-stone-900">لا توجد إشعارات</p>
                      <p className="text-xs text-stone-400">ستظهر التنبيهات الجديدة هنا فور وصولها.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-stone-100">
               <button 
                 onClick={onClose}
                 className="w-full h-12 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-black tracking-tight transition-all"
               >
                 إغلاق النافذة
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
