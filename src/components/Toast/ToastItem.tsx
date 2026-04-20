// FILE: src/components/Toast/ToastItem.tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Toast, ToastType } from '../../hooks/useToast';

interface Props {
  toast: Toast;
  onRemove: (id: string) => void;
}

const typeMap: Record<ToastType, { icon: any; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  error: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  info: { icon: Info, color: 'text-sky-500', bg: 'bg-sky-50' },
};

export const ToastItem: React.FC<Props> = ({ toast, onRemove }) => {
  const { icon: Icon, color, bg } = typeMap[toast.type];

  useEffect(() => {
    const duration = toast.type === 'error' ? 6000 : toast.type === 'warning' ? 5000 : 4000;
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border border-white/50 backdrop-blur-md min-w-[320px] max-w-md ${bg}`}
      dir="rtl"
    >
      <div className={`mt-0.5 ${color}`}>
        <Icon size={20} weight="bold" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-bold text-stone-900 leading-tight">
          {toast.message}
        </p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onRemove(toast.id);
            }}
            className="text-xs font-black text-stone-900 underline underline-offset-4 decoration-stone-200 hover:decoration-stone-900 transition-all"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-stone-400 hover:text-stone-900 transition-colors p-1"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};
