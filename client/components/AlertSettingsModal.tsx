import React from 'react';
import { Bell, Volume2, VolumeX, Shield, Play, X, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { PriceAlertConfig, ToastAlert } from '../types';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PriceAlertConfig;
  onUpdateConfig: (newConfig: PriceAlertConfig) => void;
  alertHistory: ToastAlert[];
  onClearHistory: () => void;
  onTriggerTestAlert: (direction: 'cross_above' | 'cross_below', indicator: 'EMA20' | 'SMA20') => void;
  onSelectSymbol: (symbol: string) => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  alertHistory,
  onClearHistory,
  onTriggerTestAlert,
  onSelectSymbol,
}) => {
  if (!isOpen) return null;

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdateConfig({ ...config, browserNotifications: true });
      } else {
        onUpdateConfig({ ...config, browserNotifications: false });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Price & Indicator Alert Rules</h3>
              <p className="text-[11px] text-slate-400">Trigger browser toasts when price crosses EMA20 or SMA20</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">Crossover Alerts Status</span>
              <span className="text-[11px] text-slate-400">
                {config.enabled ? 'Monitoring candles & ticks actively' : 'Alert monitoring paused'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => onUpdateConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {/* Indicator Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-300">Monitored Indicators</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'EMA 20 Only', value: 'EMA20' },
                { label: 'SMA 20 Only', value: 'SMA20' },
                { label: 'Both EMA & SMA', value: 'BOTH' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, indicator: opt.value as any })}
                  className={`p-2.5 rounded-xl text-xs font-mono border transition-all text-center ${
                    config.indicator === opt.value
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direction Filter */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-300">Trigger Conditions</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Cross Above (Bullish)', value: 'above' },
                { label: 'Cross Below (Bearish)', value: 'below' },
                { label: 'Both Directions', value: 'both' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, direction: opt.value as any })}
                  className={`p-2.5 rounded-xl text-xs font-mono border transition-all text-center ${
                    config.direction === opt.value
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Chime & Browser Notification Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <div className="flex items-center gap-2">
                {config.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-xs text-slate-200">Audio Chimes</span>
              </div>
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => onUpdateConfig({ ...config, soundEnabled: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-200">OS System Toast</span>
              </div>
              <button
                type="button"
                onClick={requestBrowserPermission}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                  config.browserNotifications
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {config.browserNotifications ? 'Enabled' : 'Request'}
              </button>
            </div>
          </div>

          {/* Manual Test Buttons */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                Test Toast Notifications
              </span>
              <span className="text-[10px] text-slate-400">Preview sounds & UI appearance</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onTriggerTestAlert('cross_above', 'EMA20')}
                className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Test Cross Above (Bullish)</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerTestAlert('cross_below', 'SMA20')}
                className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Test Cross Below (Bearish)</span>
              </button>
            </div>
          </div>

          {/* Alert History Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-300">
                Triggered Alert History ({alertHistory.length})
              </span>
              {alertHistory.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[11px] font-mono text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
              {alertHistory.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  No alerts triggered yet in this session.
                </div>
              ) : (
                alertHistory.map((item) => {
                  const isUp = item.direction === 'cross_above';
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 flex items-center justify-between text-xs font-mono hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isUp ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <button
                          onClick={() => {
                            onSelectSymbol(item.symbol);
                            onClose();
                          }}
                          className="font-bold text-white hover:text-blue-400 underline decoration-dotted"
                        >
                          {item.symbol}
                        </button>
                        <span className="text-slate-400">
                          crossed {isUp ? 'above' : 'below'} {item.indicator}
                        </span>
                      </div>
                      <div className="text-right text-slate-400 text-[11px]">
                        <span className="text-white font-bold mr-2">${item.currentPrice.toFixed(2)}</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
