import { useState, useEffect, useRef } from 'react';
import { Bell, Check, TrendingUp, Gift, Users, MessageCircle, Zap } from 'lucide-react';
import * as api from '../lib/api';

interface NotificationBellProps {
  walletAddress: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  bet: <TrendingUp size={12} className="text-blue-400" />,
  sell: <TrendingUp size={12} className="text-purple-400" />,
  market_created: <Zap size={12} className="text-btc" />,
  referral: <Users size={12} className="text-green-400" />,
  referral_bonus: <Gift size={12} className="text-yellow-400" />,
  resolved: <Check size={12} className="text-emerald-400" />,
  comment: <MessageCircle size={12} className="text-purple-400" />,
};

export function NotificationBell({ walletAddress }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<api.Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!walletAddress) return;
    const load = () => {
      api.getNotifications(walletAddress).then(d => {
        setNotifications(d.notifications);
        setUnread(d.unreadCount);
      }).catch(() => {});
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [walletAddress]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    api.markNotificationsRead(walletAddress).then(() => {
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    }).catch(() => {});
  };

  const [tick, setTick] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const iv = setInterval(() => setTick(Math.floor(Date.now() / 1000)), 30000);
    return () => clearInterval(iv);
  }, []);
  const timeAgo = (ts: number) => {
    const diff = tick - ts;
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <Bell size={18} className={unread > 0 ? 'text-btc' : 'text-gray-500'} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-1 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-xs font-bold text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-btc hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-8">No notifications yet</p>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-white/3 hover:bg-white/3 transition-colors ${n.read ? '' : 'bg-btc/5'}`}>
                  <div className="mt-0.5 shrink-0">{typeIcon[n.type] || <Bell size={12} className="text-gray-500" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{n.title}</p>
                    {n.body && <p className="text-[10px] text-gray-500 truncate">{n.body}</p>}
                  </div>
                  <span className="text-[9px] text-gray-600 shrink-0">{timeAgo(n.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
