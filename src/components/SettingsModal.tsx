import React from 'react';
import { PersonalityVibe, VoicePersona } from '../types/assistant';
import { X, Sliders, Volume2, Sparkles, Mic, FileText, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vibe: PersonalityVibe;
  onChangeVibe: (v: PersonalityVibe) => void;
  voice: VoicePersona;
  onChangeVoice: (v: VoicePersona) => void;
  showSubtitles: boolean;
  onToggleSubtitles: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  vibe,
  onChangeVibe,
  voice,
  onChangeVoice,
  showSubtitles,
  onToggleSubtitles,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  const vibes: { id: PersonalityVibe; name: string; desc: string; badge: string }[] = [
    {
      id: 'sassy',
      name: 'Sassy & Witty',
      desc: 'Quick comebacks, playful sarcasm, bold and confident attitude.',
      badge: 'Default',
    },
    {
      id: 'flirty',
      name: 'Flirty & Playful',
      desc: 'Warm, charming, slightly teasing like a close girlfriend.',
      badge: 'Popular',
    },
    {
      id: 'bossy',
      name: 'Boss Girl Mode',
      desc: 'Sharp, direct, humorous dominance and hyper-efficient.',
      badge: 'Feisty',
    },
    {
      id: 'sweet',
      name: 'Sweet Bestie',
      desc: 'Supportive, bubbly, encouraging with light jokes.',
      badge: 'Cozy',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md rounded-3xl p-6 bg-[#121124] border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Zoya Settings</h3>
              <p className="text-xs text-zinc-400">Customize personality & audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-5 pr-1">
          {/* Personality Vibe Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-purple-300 block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Personality Vibe
            </label>
            <div className="grid grid-cols-1 gap-2">
              {vibes.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onChangeVibe(v.id)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    vibe === v.id
                      ? 'bg-purple-600/20 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{v.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                        {v.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{v.desc}</p>
                  </div>
                  {vibe === v.id && <Check className="w-4 h-4 text-purple-400 shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Model Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-purple-300 block mb-2 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              Voice Persona
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeVoice('Aoede')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  voice === 'Aoede'
                    ? 'bg-purple-600/20 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  Aoede
                  {voice === 'Aoede' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">High energy, vibrant, sassy</div>
              </button>

              <button
                onClick={() => onChangeVoice('Kore')}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  voice === 'Kore'
                    ? 'bg-purple-600/20 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  Kore
                  {voice === 'Kore' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Warm, smooth, sultry</div>
              </button>
            </div>
          </div>

          {/* Subtitles & Audio Toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Live Subtitles</div>
                  <div className="text-[10px] text-zinc-400">Show spoken text transcript on screen</div>
                </div>
              </div>
              <button
                onClick={onToggleSubtitles}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  showSubtitles ? 'bg-purple-600' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    showSubtitles ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Mute Microphone</div>
                  <div className="text-[10px] text-zinc-400">Mute mic without disconnecting</div>
                </div>
              </div>
              <button
                onClick={onToggleMute}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isMuted ? 'bg-rose-600' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    isMuted ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
