import React from 'react';
import { PhoneCallRequest, AlarmItem, ActionHistoryItem } from '../types/assistant';
import {
  Phone,
  PhoneOff,
  Bell,
  Clock,
  ExternalLink,
  MapPin,
  CheckCircle2,
  X,
  Compass,
  AlertTriangle,
  Play,
} from 'lucide-react';

interface ActionCardsProps {
  activeCallRequest: PhoneCallRequest | null;
  onConfirmCall: (id: string, telUri: string) => void;
  onDeclineCall: (id: string) => void;
  alarms: AlarmItem[];
  onDismissAlarm: (id: string) => void;
  recentAction: ActionHistoryItem | null;
  onDismissRecentAction: () => void;
}

export const ActionCards: React.FC<ActionCardsProps> = ({
  activeCallRequest,
  onConfirmCall,
  onDeclineCall,
  alarms,
  onDismissAlarm,
  recentAction,
  onDismissRecentAction,
}) => {
  return (
    <>
      {/* 1. Phone Call Permission Dialog (Prompt requirement: Phone call shuru karna user permission ke saath) */}
      {activeCallRequest && activeCallRequest.status === 'pending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl p-6 bg-[#161426] border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col items-center text-center">
            {/* Glowing avatar ring */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 mb-4 shadow-[0_0_20px_rgba(236,72,153,0.4)]">
              <div className="w-full h-full rounded-full bg-[#121020] flex items-center justify-center text-pink-300">
                <Phone className="w-9 h-9 animate-bounce" />
              </div>
            </div>

            <span className="text-[11px] font-bold tracking-wider text-pink-400 uppercase mb-1">
              Call Permission Requested by Zoya
            </span>
            <h3 className="text-xl font-bold text-white mb-1">
              {activeCallRequest.contactName}
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-mono">
              {activeCallRequest.phoneNumber || '+91 (Auto-Dialer)'}
            </p>

            <p className="text-xs text-zinc-300/80 mb-6 bg-purple-950/40 p-3 rounded-xl border border-purple-800/30">
              Zoya wants to start a phone call. For your safety, please confirm to dial this number.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => onDeclineCall(activeCallRequest.id)}
                className="py-3 px-4 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4 text-zinc-400" />
                Decline
              </button>

              <button
                onClick={() =>
                  onConfirmCall(
                    activeCallRequest.id,
                    `tel:${activeCallRequest.phoneNumber || '1234567890'}`
                  )
                }
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                Call Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Ringing Alarms Overlay */}
      {alarms
        .filter((a) => a.isRinging)
        .map((alarm) => (
          <div
            key={alarm.id}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-pulse"
          >
            <div className="w-full max-w-sm rounded-3xl p-6 bg-[#251020] border-2 border-pink-500 shadow-[0_0_60px_rgba(236,72,153,0.6)] flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-pink-500/20 border-2 border-pink-500 flex items-center justify-center text-pink-400 mb-4 animate-bounce">
                <Bell className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1">
                Alarm Ringing!
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">{alarm.label}</h3>
              <p className="text-sm text-zinc-300 mb-6">Time is up! Wake up, rockstar.</p>
              <button
                onClick={() => onDismissAlarm(alarm.id)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:brightness-110 active:scale-95 cursor-pointer"
              >
                Dismiss Alarm
              </button>
            </div>
          </div>
        ))}

      {/* 3. Floating Recent Action Notification / Pill */}
      {recentAction && (
        <div className="fixed top-20 left-4 right-4 max-w-sm mx-auto z-40 animate-slide-down">
          <div className="p-3.5 rounded-2xl bg-[#141224]/90 border border-purple-500/40 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.25)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                {recentAction.toolName === 'openApp' && <ExternalLink className="w-4 h-4" />}
                {recentAction.toolName === 'openWebsite' && <ExternalLink className="w-4 h-4" />}
                {recentAction.toolName === 'openMaps' && <MapPin className="w-4 h-4 text-cyan-400" />}
                {recentAction.toolName === 'setAlarm' && <Clock className="w-4 h-4 text-amber-400" />}
                {recentAction.toolName === 'initiatePhoneCall' && <Phone className="w-4 h-4 text-emerald-400" />}
                {recentAction.toolName === 'playMusic' && <Play className="w-4 h-4 text-pink-400" />}
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                  Action Executed
                </span>
                <span className="text-xs font-semibold text-white truncate">
                  {recentAction.summary}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {recentAction.details?.url && (
                <a
                  href={recentAction.details.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-purple-600/40 hover:bg-purple-600/70 border border-purple-400/40 text-[11px] font-semibold text-purple-200 flex items-center gap-1"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={onDismissRecentAction}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
