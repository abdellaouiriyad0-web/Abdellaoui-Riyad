// FILE: src/components/Notifications/NotificationItem.tsx
import React from 'react';
import { motion } from 'motion/react';
import { UserPlus, FileSearch, CreditCard, ShieldAlert, Settings, X, ChevronLeft } from 'lucide-react';
import { AppNotification } from '../../context/AppContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  notification: AppNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const iconMap: Record<AppNotification['type'], any> = {
  new_user: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'مستخدم جديد' },
  vet_request: { icon: FileSearch, color: 'text-blue-500', bg: 'bg-blue-50', label: 'طلب تحقق' },
  payment_fail: { icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-50', label: 'عملية دفع' },
  ai_limit: { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-50', label: 'تنبيه AI' },
  system: { icon: Settings, color: 'text-stone-400', bg: 'bg-stone-50', label: 'النظام' }
};

export const NotificationItem: React.FC<Props> = ({ notification, onRead, onDismiss }) => {
  const { icon: Icon, color, bg, label } = iconMap[notification.type];

  const getActionLabel = () => {
    switch (notification.type) {
      case 'new_user': return 'عرض الملف';
      case 'vet_request': return 'مراجعة الطلب';
      case 'payment_fail': return 'عرض التفاصيل';
      case 'ai_limit': return 'رفع الحد';
      default: return null;
    }
  };

  return (
    <motion.div
      layout
      className={`group relative p-4 flex gap-4 transition-all hover:bg-stone-50 border-b border-stone-100 ${!notification.read ? 'bg-emerald-50/30' : ''}`}
      dir="rtl"
    >
      {/* Icon Area */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${bg} ${color}`}>
        <Icon size={22} />
      </div>

      {/* Content Area */}
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</span>
            <h4 className={`text-sm font-black transition-colors ${!notification.read ? 'text-stone-900' : 'text-stone-500'}`}>
              {notification.title}
            </h4>
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ar })}
          </span>
        </div>
        
        <p className="text-xs text-stone-500 leading-relaxed">
          {notification.message}
        </p>

        <div className="flex items-center gap-3 pt-1">
          {!notification.read && (
            <button 
              onClick={() => onRead(notification.id)}
              className="text-[11px] font-black text-brand-green flex items-center gap-1 hover:gap-2 transition-all"
            >
              تعليم كمقروء <ChevronLeft size={14} />
            </button>
          )}
          {getActionLabel() && (
            <button className="text-[11px] font-black text-stone-900 bg-white border border-stone-200 px-3 py-1 rounded-lg hover:shadow-sm transition-all focus:ring-2 focus:ring-stone-100">
              {getActionLabel()}
            </button>
          )}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={() => onDismiss(notification.id)}
        className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-400 hover:text-rose-500"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};
