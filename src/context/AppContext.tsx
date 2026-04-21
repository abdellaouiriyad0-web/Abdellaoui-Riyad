// FILE: src/context/AppContext.tsx
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// --- Types ---

export interface User {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  wilaya?: string;
  role: 'farmer' | 'veterinarian' | 'engineer' | 'supplier' | 'admin' | 'trader';
  status: 'active' | 'suspended';
  createdAt: any;
  subscriptionPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  lastSeen?: any;
  photoURL?: string | null;
  isVerified?: boolean;
  isBlocked?: boolean;
  photoURL?: string | null;
  isVerified?: boolean;
  isBlocked?: boolean;
}

export interface Specialist extends User {
  specialization: string;
  approvalStatus: 'submitted' | 'docs_review' | 'admin_review' | 'published' | 'rejected';
  rejectionReason?: string;
  rejectionNote?: string;
  documents?: { id: string; name: string; status: 'pending' | 'approved' | 'rejected' }[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  status: 'draft' | 'review' | 'published' | 'rejected';
  rejectionReason?: string;
  rejectionNote?: string;
  creatorId: string;
  createdAt: any;
}

export interface AppNotification {
  id: string;
  type: 'new_user' | 'vet_request' | 'payment_fail' | 'ai_limit' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  targetId?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  adminName: string;
  adminAvatar?: string;
  action: string;
  target: { type: string; id: string; name: string };
  details: string;
  ipAddress: string;
}

export interface AppSettings {
  notifToggles: Record<string, boolean>;
  webhooks: any[];
  adminRoles: string[];
}

interface AppState {
  users: User[];
  specialists: Specialist[];
  products: Product[];
  notifications: AppNotification[];
  subscriptions: any[];
  auditLog: AuditEntry[];
  settings: AppSettings;
}

type AppAction =
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_SPECIALISTS'; payload: Specialist[] }
  | { type: 'UPDATE_SPECIALIST_STATUS'; payload: { id: string; status: Specialist['approvalStatus']; audit?: AuditEntry } }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'UPDATE_PRODUCT_STATUS'; payload: { id: string; status: Product['status']; audit?: AuditEntry } }
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'DISMISS_NOTIFICATION'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'ADD_AUDIT_LOG'; payload: AuditEntry }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'UPDATE_PLAN'; payload: { userId: string; plan: User['subscriptionPlan'] } };

// --- Initial State ---

const initialState: AppState = {
  users: [],
  specialists: [],
  products: [],
  notifications: [],
  subscriptions: [],
  auditLog: [],
  settings: {
    notifToggles: JSON.parse(localStorage.getItem('agrolife_notif_settings') || '{}'),
    webhooks: [],
    adminRoles: ['Super Admin', 'Content Moderator', 'Support']
  }
};

// --- Reducer ---

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_SPECIALISTS':
      return { ...state, specialists: action.payload };
    case 'UPDATE_SPECIALIST_STATUS': {
      const { id, status, audit } = action.payload;
      return {
        ...state,
        specialists: state.specialists.map(s => s.id === id ? { ...s, approvalStatus: status } : s),
        auditLog: audit ? [audit, ...state.auditLog] : state.auditLog
      };
    }
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'UPDATE_PRODUCT_STATUS': {
      const { id, status, audit } = action.payload;
      return {
        ...state,
        products: state.products.map(p => p.id === id ? { ...p, status } : p),
        auditLog: audit ? [audit, ...state.auditLog] : state.auditLog
      };
    }
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'ADD_AUDIT_LOG':
      return { ...state, auditLog: [action.payload, ...state.auditLog] };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case 'UPDATE_PLAN':
      return { ...state, users: state.users.map(u => u.id === action.payload.userId ? { ...u, subscriptionPlan: action.payload.plan } : u) };
    default:
      return state;
  }
}

// --- Context ---

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const simStarted = React.useRef(false);

  // Persistence for settings
  useEffect(() => {
    localStorage.setItem('agrolife_notif_settings', JSON.stringify(state.settings.notifToggles));
  }, [state.settings.notifToggles]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
