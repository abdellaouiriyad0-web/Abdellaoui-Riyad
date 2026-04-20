// FILE: src/components/ConfirmDialog.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, HelpCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  destructiveConfirmName?: string; // If provided, user must type this to confirm
}

export const ConfirmDialog: React.FC<Props> = ({ 
  isOpen, 
  title, 
  message, 
  confirmLabel = "تأكيد", 
  cancelLabel = "إلغاء", 
  variant = 'info', 
  onConfirm, 
  onCancel,
  destructiveConfirmName
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // Reset input when dialog closes
  useEffect(() => {
    if (!isOpen) setInputValue('');
  }, [isOpen]);

  const isDestructiveMatched = !destructiveConfirmName || inputValue === destructiveConfirmName;

  const themes = {
    danger: {
      icon: Trash2,
      color: 'text-rose-500',
      btn: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200',
      border: 'border-rose-100',
      bg: 'bg-rose-50'
    },
    warning: {
      icon: AlertCircle,
      color: 'text-amber-500',
      btn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200',
      border: 'border-amber-100',
      bg: 'bg-amber-50'
    },
    info: {
      icon: HelpCircle,
      color: 'text-brand-green',
      btn: 'bg-brand-green hover:bg-brand-green-dark text-white shadow-emerald-200',
      border: 'border-emerald-100',
      bg: 'bg-emerald-50'
    }
  };

  const theme = themes[variant];
  const Icon = theme.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full max-w-md bg-white rounded-[32px] overflow-hidden border border-stone-200 shadow-2xl`}
            dir="rtl"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${theme.bg} ${theme.color}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-black text-stone-900 tracking-tight">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{message}</p>
                </div>
                <button onClick={onCancel} className="text-stone-400 hover:text-stone-900 transition-colors p-1">
                  <X size={20} />
                </button>
              </div>

              {destructiveConfirmName && (
                <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <p className="text-[10px] uppercase font-black text-stone-400 tracking-widest">
                    يرجى كتابة <span className="text-rose-500 underline">{destructiveConfirmName}</span> للتأكيد:
                  </p>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={destructiveConfirmName}
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none text-right placeholder:opacity-30"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onConfirm}
                  disabled={!isDestructiveMatched}
                  className={`flex-1 h-14 rounded-2xl font-black tracking-tight transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 ${theme.btn}`}
                >
                  {confirmLabel}
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 h-14 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl font-black tracking-tight transition-all active:scale-95"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
