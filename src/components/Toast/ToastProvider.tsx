// FILE: src/components/Toast/ToastProvider.tsx
import React, { useState, useCallback, ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { ToastContext, Toast, ToastType, ToastAction } from '../../hooks/useToast';
import { ToastItem } from './ToastItem';

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType, action?: ToastAction) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts(prev => {
      const newToasts = [...prev, { id, message, type, action }];
      // Keep only last 4 toasts
      if (newToasts.length > 4) {
        return newToasts.slice(1);
      }
      return newToasts;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {toasts.map(toast => (
              <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
};
