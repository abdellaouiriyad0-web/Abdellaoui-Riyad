// FILE: src/hooks/useToast.ts
import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType, action?: ToastAction) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    success: (msg: string) => context.addToast(msg, 'success'),
    error: (msg: string) => context.addToast(msg, 'error'),
    warning: (msg: string) => context.addToast(msg, 'warning'),
    info: (msg: string) => context.addToast(msg, 'info'),
    action: (msg: string, label: string, fn: () => void) => 
      context.addToast(msg, 'info', { label, onClick: fn }),
  };
};
