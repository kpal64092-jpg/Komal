import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AssistantState,
  PersonalityVibe,
  VoicePersona,
  PhoneCallRequest,
  AlarmItem,
  ActionHistoryItem,
  ToolCallPayload,
} from './types/assistant';
import { LiveClient } from './services/liveClient';
import { ZoyaOrb } from './components/ZoyaOrb';
import { AudioVisualizerWave } from './components/AudioVisualizerWave';
import { ActionCards } from './components/ActionCards';
import { ActiveAlarmsList } from './components/ActiveAlarmsList';
import { VoiceCommandsModal } from './components/VoiceCommandsModal';
import { SettingsModal } from './components/SettingsModal';
import {
  Sparkles,
  Sliders,
  HelpCircle,
  Clock,
  Mic,
  MicOff,
  Power,
  Volume2,
  Phone,
  Flame,
  MessageCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [vibe, setVibe] = useState<PersonalityVibe>('sassy');
  const [voice, setVoice] = useState<VoicePersona>('Aoede');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [subtitle, setSubtitle] = useState<{ text: string; role: 'model' | 'user' } | null>(null);

  // Tools & Intent state
  const [activeCallRequest, setActiveCallRequest] = useState<PhoneCallRequest | null>(null);
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [recentAction, setRecentAction] = useState<ActionHistoryItem | null>(null);

  // Modals
  const [isCommandsOpen, setIsCommandsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAlarmsOpen, setIsAlarmsOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const liveClientRef = useRef<LiveClient | null>(null);
  const subtitleTimeoutRef = useRef<any>(null);

  // Sound chime synthesizer for alarms & activation
  const playChime = useCallback((type: 'alarm' | 'wake' | 'action') => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'alarm') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'wake') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // AudioContext policy
    }
  }, []);

  // Alarms ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setAlarms((prev) =>
        prev.map((alarm) => {
          if (alarm.isRinging) return alarm;
          if (alarm.remainingSeconds <= 1) {
            playChime('alarm');
            return {
              ...alarm,
              remainingSeconds: 0,
              isRinging: true,
            };
          }
          return {
            ...alarm,
            remainingSeconds: alarm.remainingSeconds - 1,
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [playChime]);

  // Handle Tool Calls triggered by Zoya
  const handleToolCall = useCallback(
    async (payload: ToolCallPayload): Promise<Record<string, any>> => {
      console.log('[App] Executing tool call:', payload.name, payload.args);
      playChime('action');

      const toolName = payload.name;
      const args = payload.args || {};

      if (toolName === 'openWebsite') {
        let url = (args.url || '').trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        const label = args.label || url;
        window.open(url, '_blank', 'noopener,noreferrer');

        const item: ActionHistoryItem = {
          id: Math.random().toString(36).substring(7),
          toolName: 'openWebsite',
          summary: `Opened website: ${label}`,
          timestamp: Date.now(),
          details: { url, label },
          status: 'executed',
        };
        setRecentAction(item);
        return { status: 'success', opened: true, url, label };
      }

      if (toolName === 'openApp') {
        const appName = (args.appName || '').toLowerCase().trim();
        const query = args.query ? args.query.trim() : '';
        let targetUrl = '';
        let label = appName.toUpperCase();

        if (appName.includes('youtube')) {
          targetUrl = query
            ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
            : 'https://www.youtube.com';
          label = query ? `YouTube: "${query}"` : 'YouTube';
        } else if (appName.includes('whatsapp')) {
          targetUrl = query
            ? `https://web.whatsapp.com/send?text=${encodeURIComponent(query)}`
            : 'https://web.whatsapp.com';
          label = 'WhatsApp';
        } else if (appName.includes('instagram')) {
          targetUrl = query
            ? `https://www.instagram.com/explore/tags/${encodeURIComponent(query)}/`
            : 'https://www.instagram.com';
          label = 'Instagram';
        } else if (appName.includes('spotify')) {
          targetUrl = query
            ? `https://open.spotify.com/search/${encodeURIComponent(query)}`
            : 'https://open.spotify.com';
          label = query ? `Spotify: "${query}"` : 'Spotify';
        } else if (appName.includes('map')) {
          targetUrl = query
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
            : 'https://www.google.com/maps';
          label = query ? `Maps: "${query}"` : 'Google Maps';
        } else {
          targetUrl = `https://www.google.com/search?q=${encodeURIComponent(appName + ' ' + query)}`;
          label = `${appName}`;
        }

        if (targetUrl) {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }

        const item: ActionHistoryItem = {
          id: Math.random().toString(36).substring(7),
          toolName: 'openApp',
          summary: `Opened ${label}`,
          timestamp: Date.now(),
          details: { appName, query, url: targetUrl },
          status: 'executed',
        };
        setRecentAction(item);
        return { status: 'success', launched: true, appName, targetUrl };
      }

      if (toolName === 'initiatePhoneCall') {
        const contactName = args.contactName || 'Friend';
        const phoneNumber = args.phoneNumber || '+91 98765 43210';
        const callReq: PhoneCallRequest = {
          id: Math.random().toString(36).substring(7),
          contactName,
          phoneNumber,
          status: 'pending',
          timestamp: Date.now(),
        };
        setActiveCallRequest(callReq);

        const item: ActionHistoryItem = {
          id: callReq.id,
          toolName: 'initiatePhoneCall',
          summary: `Call requested: ${contactName}`,
          timestamp: Date.now(),
          details: { contactName, phoneNumber },
          status: 'pending',
        };
        setRecentAction(item);
        return {
          status: 'prompted',
          message: `Confirmation popup shown to user for calling ${contactName}`,
        };
      }

      if (toolName === 'setAlarm') {
        const timeStr = args.time || '5 minutes';
        const label = args.label || 'Alarm';
        let secs = args.seconds;

        if (!secs) {
          const matchNum = timeStr.match(/\d+/);
          const num = matchNum ? parseInt(matchNum[0], 10) : 5;
          if (timeStr.toLowerCase().includes('second')) {
            secs = num;
          } else if (timeStr.toLowerCase().includes('hour')) {
            secs = num * 3600;
          } else {
            secs = num * 60; // default minutes
          }
        }

        const newAlarm: AlarmItem = {
          id: Math.random().toString(36).substring(7),
          label,
          timeStr,
          totalSeconds: secs,
          remainingSeconds: secs,
          isRinging: false,
          createdAt: Date.now(),
        };

        setAlarms((prev) => [newAlarm, ...prev]);

        const item: ActionHistoryItem = {
          id: newAlarm.id,
          toolName: 'setAlarm',
          summary: `Alarm set: ${label} (${timeStr})`,
          timestamp: Date.now(),
          details: { label, timeStr, totalSeconds: secs },
          status: 'executed',
        };
        setRecentAction(item);
        return { status: 'success', alarmSet: true, label, timeStr, seconds: secs };
      }

      if (toolName === 'openMaps') {
        const location = args.location || 'nearby';
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        window.open(url, '_blank', 'noopener,noreferrer');

        const item: ActionHistoryItem = {
          id: Math.random().toString(36).substring(7),
          toolName: 'openMaps',
          summary: `Maps search: ${location}`,
          timestamp: Date.now(),
          details: { location, url },
          status: 'executed',
        };
        setRecentAction(item);
        return { status: 'success', opened: true, location, url };
      }

      if (toolName === 'playMusic') {
        const trackName = args.trackName || 'party hits';
        const platform = (args.platform || 'youtube').toLowerCase();
        const url =
          platform === 'spotify'
            ? `https://open.spotify.com/search/${encodeURIComponent(trackName)}`
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(trackName)}`;

        window.open(url, '_blank', 'noopener,noreferrer');

        const item: ActionHistoryItem = {
          id: Math.random().toString(36).substring(7),
          toolName: 'playMusic',
          summary: `Playing "${trackName}" on ${platform}`,
          timestamp: Date.now(),
          details: { trackName, platform, url },
          status: 'executed',
        };
        setRecentAction(item);
        return { status: 'success', playing: true, trackName, platform, url };
      }

      return { status: 'unknown_tool', toolName };
    },
    [playChime]
  );

  // Initialize or connect LiveClient
  const handleTogglePower = useCallback(async () => {
    if (state === 'disconnected' || state === 'error') {
      setErrorMessage(null);
      playChime('wake');

      const client = new LiveClient({
        onStateChange: (newState) => {
          setState(newState);
        },
        onTranscription: (text, role) => {
          setSubtitle({ text, role });
          if (subtitleTimeoutRef.current) {
            clearTimeout(subtitleTimeoutRef.current);
          }
          subtitleTimeoutRef.current = setTimeout(() => {
            setSubtitle(null);
          }, 4500);
        },
        onToolCall: handleToolCall,
        onError: (err) => {
          setErrorMessage(err);
          setState('error');
        },
        onAudioLevel: (lvl) => {
          setAudioLevel(lvl);
        },
      });

      liveClientRef.current = client;
      await client.connect({
        voiceName: voice,
        vibe,
      });
    } else {
      // Disconnect
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      setState('disconnected');
      setAudioLevel(0);
      setSubtitle(null);
    }
  }, [state, voice, vibe, handleToolCall, playChime]);

  // Interrupt Zoya
  const handleInterrupt = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.interrupt();
    }
  }, []);

  // Mute toggle
  const handleToggleMute = useCallback(() => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (liveClientRef.current) {
      liveClientRef.current.setMuted(newMute);
    }
  }, [isMuted]);

  // Phone Call Actions
  const handleConfirmCall = useCallback((id: string, telUri: string) => {
    setActiveCallRequest(null);
    window.location.href = telUri;
  }, []);

  const handleDeclineCall = useCallback((id: string) => {
    setActiveCallRequest(null);
  }, []);

  // Alarms
  const handleDismissAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleDeleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Vibe info
  const vibeLabels: Record<PersonalityVibe, { name: string; tag: string }> = {
    sassy: { name: 'Sassy & Witty', tag: '✨ Sassy' },
    flirty: { name: 'Flirty & Playful', tag: '💖 Flirty' },
    bossy: { name: 'Boss Girl', tag: '🔥 Bossy' },
    sweet: { name: 'Sweet Bestie', tag: '🌸 Bestie' },
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#080811] text-zinc-100 overflow-hidden font-sans">
      {/* Background Cyber Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none opacity-40" />

      {/* TOP HUD BAR */}
      <header className="relative z-30 w-full max-w-5xl mx-auto px-4 pt-4 sm:pt-6 flex items-center justify-between">
        {/* Brand & Vibe Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 p-0.5 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
              <div className="w-full h-full rounded-2xl bg-[#0c0a1a] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-pink-400" />
              </div>
            </div>
            {state !== 'disconnected' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080811] animate-pulse" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Zoya
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300">
                  Live AI
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-zinc-400">Audio-to-Audio Assistant</p>
          </div>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Active Alarms indicator */}
          <button
            onClick={() => setIsAlarmsOpen(!isAlarmsOpen)}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative ${
              alarms.length > 0
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
            }`}
            aria-label="Active alarms"
            title="Active Alarms"
          >
            <Clock className="w-4 h-4" />
            {alarms.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-bold flex items-center justify-center">
                {alarms.length}
              </span>
            )}
          </button>

          {/* Commands Guide Button */}
          <button
            onClick={() => setIsCommandsOpen(true)}
            className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            aria-label="Commands guide"
            title="Voice Commands Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            aria-label="Settings"
            title="Settings & Persona"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-zinc-400 hover:text-white transition-all hidden sm:flex cursor-pointer"
            aria-label="Fullscreen"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ACTIVE ALARMS DRAWER (if toggled) */}
      {isAlarmsOpen && (
        <div className="relative z-40 max-w-sm w-full mx-auto px-4 mt-2">
          <ActiveAlarmsList
            alarms={alarms}
            onDeleteAlarm={handleDeleteAlarm}
            onClose={() => setIsAlarmsOpen(false)}
          />
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="relative z-40 max-w-md mx-auto px-4 mt-2">
          <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs underline ml-2 font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MAIN STAGE: CENTRAL ORB */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-2">
        {/* Floating Subtitle / Live Transcript Pill */}
        {showSubtitles && subtitle && (
          <div className="mb-4 max-w-md w-full px-4 animate-fade-in text-center">
            <div
              className={`inline-block px-4 py-2 rounded-2xl backdrop-blur-xl border text-xs sm:text-sm font-medium shadow-xl ${
                subtitle.role === 'model'
                  ? 'bg-purple-950/70 border-pink-500/30 text-pink-200 shadow-[0_0_25px_rgba(236,72,153,0.2)]'
                  : 'bg-zinc-900/80 border-cyan-500/30 text-cyan-200'
              }`}
            >
              <span className="font-bold mr-1.5 opacity-80">
                {subtitle.role === 'model' ? 'Zoya:' : 'You:'}
              </span>
              "{subtitle.text}"
            </div>
          </div>
        )}

        {/* Central Orb */}
        <ZoyaOrb
          state={state}
          audioLevel={audioLevel}
          vibe={vibe}
          isMuted={isMuted}
          onTogglePower={handleTogglePower}
          onInterrupt={handleInterrupt}
          streamerAnalyser={liveClientRef.current?.getStreamerAnalyser() || null}
          recorderAnalyser={liveClientRef.current?.getRecorderAnalyser() || null}
        />

        {/* Audio Waveform Spectrum */}
        <div className="mt-4 w-full">
          <AudioVisualizerWave
            state={state}
            streamerAnalyser={liveClientRef.current?.getStreamerAnalyser() || null}
            recorderAnalyser={liveClientRef.current?.getRecorderAnalyser() || null}
            isMuted={isMuted}
          />
        </div>
      </main>

      {/* BOTTOM CONTROL & QUICK ACTION DOCK */}
      <footer className="relative z-30 w-full max-w-lg mx-auto px-4 pb-4 sm:pb-6 flex flex-col items-center gap-3">
        {/* Quick Voice Command Chips (Touch to inspire) */}
        {state !== 'disconnected' && (
          <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-1 no-scrollbar text-xs">
            <button
              onClick={() => setIsCommandsOpen(true)}
              className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              💬 WhatsApp kholo
            </button>
            <button
              onClick={() => setIsCommandsOpen(true)}
              className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              🎵 YouTube open karo
            </button>
            <button
              onClick={() => setIsCommandsOpen(true)}
              className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              ⏰ 5 min alarm
            </button>
            <button
              onClick={() => setIsCommandsOpen(true)}
              className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              📞 Call Rahul
            </button>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="w-full p-2 rounded-3xl bg-[#121124]/90 border border-white/10 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3">
          {/* Mute Mic Button */}
          <button
            onClick={handleToggleMute}
            disabled={state === 'disconnected'}
            className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              state === 'disconnected'
                ? 'opacity-40 cursor-not-allowed bg-zinc-800/40 text-zinc-500'
                : isMuted
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
            <span>{isMuted ? 'Unmute' : 'Mute Mic'}</span>
          </button>

          {/* Quick Interrupt Button (enabled while speaking) */}
          {state === 'speaking' && (
            <button
              onClick={handleInterrupt}
              className="py-3 px-5 rounded-2xl bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse cursor-pointer shadow-[0_0_20px_rgba(236,72,153,0.3)]"
            >
              <span>Interrupt</span>
            </button>
          )}

          {/* Power Toggle Button */}
          <button
            onClick={handleTogglePower}
            className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-lg ${
              state === 'disconnected'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-[0_0_25px_rgba(236,72,153,0.3)]'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{state === 'disconnected' ? 'Wake Zoya' : 'Disconnect'}</span>
          </button>
        </div>
      </footer>

      {/* ACTION DIALOGS, CONFIRMATIONS & CARDS */}
      <ActionCards
        activeCallRequest={activeCallRequest}
        onConfirmCall={handleConfirmCall}
        onDeclineCall={handleDeclineCall}
        alarms={alarms}
        onDismissAlarm={handleDismissAlarm}
        recentAction={recentAction}
        onDismissRecentAction={() => setRecentAction(null)}
      />

      {/* VOICE COMMANDS GUIDE MODAL */}
      <VoiceCommandsModal
        isOpen={isCommandsOpen}
        onClose={() => setIsCommandsOpen(false)}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        vibe={vibe}
        onChangeVibe={setVibe}
        voice={voice}
        onChangeVoice={setVoice}
        showSubtitles={showSubtitles}
        onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}
