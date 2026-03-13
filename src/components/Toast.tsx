import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2, ExternalLink, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  link?: string;
  linkLabel?: string;
  duration?: number; // ms, 0 = no auto-dismiss
}

interface ToastItemProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const TOAST_STYLES: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    icon: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />,
  },
  error: {
    bg: 'bg-red-500/15 border-red-500/40 text-red-300',
    icon: <XCircle size={18} className="text-red-400 shrink-0" />,
  },
  warning: {
    bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    icon: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
  },
  info: {
    bg: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
    icon: <Info size={18} className="text-blue-400 shrink-0" />,
  },
  loading: {
    bg: 'bg-btc/15 border-btc/40 text-btc-light',
    icon: <Loader2 size={18} className="text-btc animate-spin shrink-0" />,
  },
};

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = toast.duration ?? (toast.type === 'loading' ? 0 : toast.type === 'error' ? 6000 : 4000);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (duration <= 0) return;

    // Progress bar
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
    }, 50);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => { clearTimeout(timer); clearInterval(iv); };
  }, [duration, toast.id, onClose]);

  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

  return (
    <div
      className={`pointer-events-auto flex flex-col rounded-2xl shadow-2xl max-w-sm w-full backdrop-blur-xl border overflow-hidden transition-all duration-300 ${style.bg} ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {style.icon}
        <span className="text-sm font-medium flex-1 leading-snug">
          {toast.message}
          {toast.link && (
            <a
              href={toast.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 ml-1.5 text-btc hover:text-btc-light hover:underline transition-colors"
            >
              <ExternalLink size={11} />
              {toast.linkLabel || 'View TX'}
            </a>
          )}
        </span>
        <button
          onClick={() => { setVisible(false); setTimeout(() => onClose(toast.id), 300); }}
          className="text-gray-500 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/10 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-current opacity-30 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// --- Toast Container (manages stack) ---

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}

// --- Hook for managing toasts ---

let toastCounter = 0;

// eslint-disable-next-line react-refresh/only-export-components
export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((
    message: string,
    type: ToastType = 'success',
    link?: string,
    linkLabel?: string,
    duration?: number,
  ): string => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts(prev => {
      // Replace loading toast with same message prefix if exists
      const filtered = type !== 'loading' ? prev.filter(t => t.type !== 'loading') : prev;
      // Max 4 toasts
      const limited = filtered.length >= 4 ? filtered.slice(1) : filtered;
      return [...limited, { id, message, type, link, linkLabel, duration }];
    });
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<ToastData, 'id'>>) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  return { toasts, addToast, removeToast, updateToast, clearToasts };
}

// --- Legacy single-toast compatibility ---

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  link?: string;
  linkLabel?: string;
  onClose: () => void;
}

export function Toast({ message, type = 'success', link, linkLabel, onClose }: ToastProps) {
  const [toast] = useState<ToastData>(() => ({
    id: `legacy-${Date.now()}`,
    message,
    type,
    link,
    linkLabel,
  }));

  if (!message) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
      <ToastItem toast={toast} onClose={onClose} />
    </div>
  );
}
