import React from 'react';
import { AlarmItem } from '../types/assistant';
import { Clock, Trash2, Bell } from 'lucide-react';

interface ActiveAlarmsListProps {
  alarms: AlarmItem[];
  onDeleteAlarm: (id: string) => void;
  onClose: () => void;
}

export const ActiveAlarmsList: React.FC<ActiveAlarmsListProps> = ({
  alarms,
  onDeleteAlarm,
  onClose,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 rounded-3xl bg-[#121122]/95 border border-purple-500/20 backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-bold text-white">Active Timers & Alarms</h4>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
        >
          Close
        </button>
      </div>

      {alarms.length === 0 ? (
        <p className="text-xs text-zinc-500 py-3 text-center">
          No alarms active. Ask Zoya: "Set an alarm for 5 minutes".
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {alarms.map((alarm) => (
            <div
              key={alarm.id}
              className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{alarm.label}</div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {alarm.remainingSeconds > 0
                      ? `Remaining: ${formatTime(alarm.remainingSeconds)}`
                      : alarm.timeStr}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteAlarm(alarm.id)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                aria-label="Delete alarm"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
