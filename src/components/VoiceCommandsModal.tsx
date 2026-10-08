import React from 'react';
import { X, Sparkles, MessageSquare, ExternalLink, Phone, Bell, MapPin, Youtube, Music } from 'lucide-react';

interface VoiceCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceCommandsModal: React.FC<VoiceCommandsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const commandCategories = [
    {
      title: 'Apps & Intent Launching',
      icon: <ExternalLink className="w-4 h-4 text-cyan-400" />,
      items: [
        { en: 'Open YouTube and search lo-fi beats', hi: 'YouTube kholo aur songs chalao' },
        { en: 'Launch WhatsApp', hi: 'WhatsApp open karo' },
        { en: 'Open Instagram', hi: 'Instagram profile kholo' },
        { en: 'Open Spotify', hi: 'Spotify khol do' },
      ],
    },
    {
      title: 'Phone Calling (with permission)',
      icon: <Phone className="w-4 h-4 text-emerald-400" />,
      items: [
        { en: 'Call Rahul', hi: 'Rahul ko phone lagao' },
        { en: 'Call Mom', hi: 'Mom ko call karo' },
        { en: 'Call +91 98765 43210', hi: 'Dial this number' },
      ],
    },
    {
      title: 'Alarms & Timers',
      icon: <Bell className="w-4 h-4 text-amber-400" />,
      items: [
        { en: 'Set an alarm for 10 minutes', hi: '10 minute ka alarm laga do' },
        { en: 'Set a reminder for tea time', hi: 'Chai ke liye alarm set karo' },
        { en: 'Set a timer for 30 seconds', hi: '30 second ka timer lagao' },
      ],
    },
    {
      title: 'Maps & Navigation',
      icon: <MapPin className="w-4 h-4 text-rose-400" />,
      items: [
        { en: 'Find best cafes near me', hi: 'Aas paas acche cafe batao' },
        { en: 'Directions to Mumbai Airport', hi: 'Airport ka rasta dikhao' },
        { en: 'Open Google Maps for Goa', hi: 'Goa maps me kholo' },
      ],
    },
    {
      title: 'Sassy Banter & Flirty Fun',
      icon: <Sparkles className="w-4 h-4 text-pink-400" />,
      items: [
        { en: 'Are you single, Zoya?', hi: 'Tum itni smart kyu ho?' },
        { en: 'Tell me something sweet', hi: 'Mujhe koi achhi shayari sunao' },
        { en: 'Roast me a little', hi: 'Thoda roast karo mujhe' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-lg max-h-[85vh] rounded-3xl p-6 bg-[#121124] border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Voice Command Guide</h3>
              <p className="text-xs text-zinc-400">Speak naturally in English or Hinglish!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories list */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1">
          {commandCategories.map((cat, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                {cat.icon}
                <span>{cat.title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cat.items.map((item, j) => (
                  <div
                    key={j}
                    className="p-2.5 rounded-xl bg-[#19172e] border border-purple-500/10 hover:border-purple-500/30 transition-all text-left"
                  >
                    <div className="text-xs font-semibold text-purple-200">{item.en}</div>
                    <div className="text-[11px] text-zinc-400 italic mt-0.5">{item.hi}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>Tip: Tap the central orb anytime to interrupt!</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
