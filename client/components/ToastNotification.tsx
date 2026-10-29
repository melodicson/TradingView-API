import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, X, ExternalLink } from 'lucide-react';
import type { ToastAlert } from '../types';

interface ToastItemProps {
  toast: ToastAlert;
  onDismiss: (id: string) => void;
  onSelectSymbol?: (symbol: string) => void;
}

const TOAST_DURATION_MS = 7000;

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onSelectSymbol }) => {
  const [progress, setProgress] = useState(100);
  const isAbove = toast.direction === 'cross_above';

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`relative w-84 sm:w-96 rounded-xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${
        isAbove
          ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/40'
          : 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-950/40'
      }`}
    >
      {/* Top Banner with Alert Icon & Indicator Tag */}
      <div className="p-3.5 flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow ${
            isAbove
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
        >
          {isAbove ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-extrabold text-white">
                {toast.symbol}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                  isAbove ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {toast.indicator} Cross {isAbove ? 'Above' : 'Below'}
              </span>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-1 font-sans">
            Price crossed {isAbove ? 'above' : 'below'} the 20-period moving average.
          </p>

          {/* Pricing data pills */}
          <div className="mt-2 flex items-center gap-2 text-[11px] font-mono">
            <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
              <span className="text-slate-500 mr-1">Price:</span>
              <span className="font-bold text-white">${toast.currentPrice.toFixed(2)}</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
              <span className="text-slate-500 mr-1">{toast.indicator}:</span>
              <span className="font-semibold text-slate-300">${toast.indicatorValue.toFixed(2)}</span>
            </div>
            {onSelectSymbol && (
              <button
                onClick={() => onSelectSymbol(toast.symbol)}
                className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-sans"
              >
                View Chart <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-slate-800">
        <div
          className={`h-full transition-all ease-linear ${isAbove ? 'bg-emerald-500' : 'bg-rose-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastAlert[];
  onDismiss: (id: string) => void;
  onSelectSymbol?: (symbol: string) => void;
  onClearAll?: () => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onSelectSymbol,
  onClearAll,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-h-[85vh] overflow-hidden">
      {toasts.length > 1 && onClearAll && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={onClearAll}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shadow"
          >
            Clear all ({toasts.length})
          </button>
        </div>
      )}
      <div className="flex flex-col gap-2.5 pointer-events-auto overflow-y-auto">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            onSelectSymbol={onSelectSymbol}
          />
        ))}
      </div>
    </div>
  );
};
