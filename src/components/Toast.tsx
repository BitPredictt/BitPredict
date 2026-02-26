import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className={`fixed top-4 left-0 right-0 z-[200] flex justify-center px-4 pointer-events-none transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl max-w-sm w-full backdrop-blur-md ${
        type === 'error'
          ? 'bg-red-500/10 border border-red-500/30 text-red-300'
          : 'bg-green-500/10 border border-green-500/30 text-green-300'
      }`}>
        {type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
          <XCircle size={14} />
        </button>
      </div>
    </div>
  );
}
