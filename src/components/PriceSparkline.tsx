import { useState, useEffect, useRef } from 'react';
import * as api from '../lib/api';

interface PriceSparklineProps {
  asset: string;
  threshold?: number;
}

export function PriceSparkline({ asset, threshold }: PriceSparklineProps) {
  const [prices, setPrices] = useState<{ price: number; timestamp: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      api.getPriceHistory(asset, 10).then((data) => {
        if (mounted && data.length > 0) setPrices(data);
      }).catch(() => {});
    };
    load();
    const iv = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, [asset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const vals = prices.map((p) => p.price);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pad = 2;

    // Draw threshold line if present
    if (threshold && threshold >= min && threshold <= max) {
      const ty = h - pad - ((threshold - min) / range) * (h - pad * 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(247, 147, 26, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(w, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw price line
    const last = vals[vals.length - 1];
    const up = last >= vals[0];
    ctx.strokeStyle = up ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < vals.length; i++) {
      const x = (i / (vals.length - 1)) * w;
      const y = h - pad - ((vals[i] - min) / range) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill area
    const lastX = w;
    const lastY = h - pad - ((vals[vals.length - 1] - min) / range) * (h - pad * 2);
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, up ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();

    // Current price dot
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = up ? '#22c55e' : '#ef4444';
    ctx.fill();
  }, [prices, threshold]);

  if (prices.length < 2) return null;

  const current = prices[prices.length - 1]?.price || 0;
  const first = prices[0]?.price || 0;
  const change = first > 0 ? ((current - first) / first) * 100 : 0;
  const up = change >= 0;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 font-mono">${current.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span className={`text-[10px] font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-8 rounded" />
    </div>
  );
}
