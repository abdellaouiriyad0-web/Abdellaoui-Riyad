// FILE: src/hooks/useNotifications.ts
import { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export const useNotifications = () => {
  const { state, dispatch } = useAppContext();

  const unreadCount = useMemo(() => 
    state.notifications.filter(n => !n.read).length,
    [state.notifications]
  );

  const markAsRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, [dispatch]);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_NOTIFICATION', payload: id });
  }, [dispatch]);

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, [dispatch]);

  return {
    notifications: state.notifications,
    unreadCount,
    markAsRead,
    dismiss,
    markAllAsRead,
    clearAll
  };
};
