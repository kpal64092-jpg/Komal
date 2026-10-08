import React, { useEffect, useRef } from 'react';
import { AssistantState, PersonalityVibe } from '../types/assistant';
import { Mic, MicOff, Power, Sparkles, Volume2, Radio } from 'lucide-react';

interface ZoyaOrbProps {
  state: AssistantState;
  audioLevel: number;
  vibe: PersonalityVibe;
  isMuted: boolean;
  onTogglePower: () => void;
  onInterrupt: () => void;
  streamerAnalyser: AnalyserNode | null;
  recorderAnalyser: AnalyserNode | null;
}

export const ZoyaOrb: React.FC<ZoyaOrbProps> = ({
  state,
  audioLevel,
  vibe,
  isMuted,
  onTogglePower,
  onInterrupt,
  streamerAnalyser,
  recorderAnalyser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Vibe theme colors
  const getVibeGlow = () => {
    switch (vibe) {
      case 'flirty':
        return 'from-pink-500 via-rose-500 to-purple-600';
      case 'bossy':
        return 'from-violet-600 via-fuchsia-600 to-cyan-500';
      case 'sweet':
        return 'from-emerald-400 via-teal-500 to-indigo-500';
      case 'sassy':
      default:
        return 'from-fuchsia-500 via-purple-600 to-cyan-400';
    }
  };

  // Canvas visualizer loop for organic fluid frequency ring
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = width * 0.36;

      ctx.clearRect(0, 0, width, height);

      // Determine active analyser
      let activeAnalyser = null;
      if (state === 'speaking' && streamerAnalyser) {
        activeAnalyser = streamerAnalyser;
      } else if (state === 'listening' && recorderAnalyser && !isMuted) {
        activeAnalyser = recorderAnalyser;
      }

      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      // Draw pulsating frequency rings
      const points = 48;
      const angleStep = (Math.PI * 2) / points;

      ctx.save();
      ctx.beginPath();

      for (let i = 0; i <= points; i++) {
        const index = i % points;
        const val = dataArray[index % bufferLength] || 0;
        const normalized = val / 255;
        const offset = state === 'speaking'
          ? normalized * (width * 0.12)
          : state === 'listening'
          ? normalized * (width * 0.08)
          : Math.sin(Date.now() * 0.003 + i) * 3;

        const currentRadius = radius + offset;
        const angle = i * angleStep;
        const x = centerX + Math.cos(angle) * currentRadius;
        const y = centerY + Math.sin(angle) * currentRadius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();

      // Gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      if (state === 'speaking') {
        gradient.addColorStop(0, '#ec4899');
        gradient.addColorStop(0.5, '#a855f7');
        gradient.addColorStop(1, '#06b6d4');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3.5 + audioLevel * 3;
        ctx.shadowBlur = 18 + audioLevel * 20;
        ctx.shadowColor = '#ec4899';
      } else if (state === 'listening') {
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(0.5, '#8b5cf6');
        gradient.addColorStop(1, '#3b82f6');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5 + audioLevel * 4;
        ctx.shadowBlur = 12 + audioLevel * 16;
        ctx.shadowColor = '#06b6d4';
      } else if (state === 'connecting') {
        gradient.addColorStop(0, '#f43f5e');
        gradient.addColorStop(1, '#8b5cf6');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#8b5cf6';
      } else {
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.2)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.3)';
      }

      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, streamerAnalyser, recorderAnalyser, audioLevel, isMuted]);

  // Handle click on central orb
  const handleClick = () => {
    if (state === 'disconnected') {
      onTogglePower();
    } else if (state === 'speaking') {
      // Tap to interrupt Zoya speaking!
      onInterrupt();
    } else {
      // While listening, tap powers off or pauses
      onTogglePower();
    }
  };

  const scaleMultiplier = 1 + Math.min(0.25, audioLevel * 0.4);

  return (
    <div className="relative flex flex-col items-center justify-center my-auto select-none">
      {/* Outer Glow Halo */}
      <div
        className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-40 transition-all duration-700 pointer-events-none bg-gradient-to-tr ${getVibeGlow()}`}
        style={{
          transform: `scale(${state === 'speaking' ? 1.25 + audioLevel * 0.5 : state === 'listening' ? 1.05 + audioLevel * 0.3 : 0.85})`,
          opacity: state === 'disconnected' ? 0.2 : 0.45 + audioLevel * 0.35,
        }}
      />

      {/* Rotating Cybernetic Orbital Rings */}
      {state !== 'disconnected' && (
        <>
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-pink-500/20 border-dashed animate-spin-slow pointer-events-none" />
          <div className="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full border border-cyan-400/20 animate-spin-reverse pointer-events-none" />
        </>
      )}

      {/* Main Canvas Audio Frequency Halo */}
      <canvas
        ref={canvasRef}
        width={360}
        height={360}
        className="absolute w-72 h-72 sm:w-96 sm:h-96 pointer-events-none z-10"
      />

      {/* Central Interactive Orb Button */}
      <button
        onClick={handleClick}
        aria-label={
          state === 'disconnected'
            ? 'Wake Zoya'
            : state === 'speaking'
            ? 'Tap to Interrupt Zoya'
            : 'Power off Zoya'
        }
        className={`relative z-20 w-44 h-44 sm:w-56 sm:h-56 rounded-full cursor-pointer flex flex-col items-center justify-center transition-all duration-500 outline-none focus:ring-4 focus:ring-purple-500/40 active:scale-95 group ${
          state === 'disconnected'
            ? 'bg-gradient-to-b from-[#181628] to-[#0d0c18] border-2 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:border-pink-500/50 hover:shadow-[0_0_40px_rgba(236,72,153,0.35)]'
            : state === 'connecting'
            ? 'bg-gradient-to-b from-[#221538] to-[#120e26] border-2 border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.4)]'
            : state === 'speaking'
            ? 'bg-gradient-to-b from-[#32123c] to-[#1a0a24] border-2 border-pink-400/80 shadow-[0_0_60px_rgba(236,72,153,0.55)]'
            : 'bg-gradient-to-b from-[#14233c] to-[#0c1426] border-2 border-cyan-400/70 shadow-[0_0_50px_rgba(6,182,212,0.45)]'
        }`}
        style={{
          transform: `scale(${scaleMultiplier})`,
        }}
      >
        {/* Core Bioluminescent Texture / Pulse */}
        <div
          className={`absolute inset-2 rounded-full opacity-70 blur-md transition-all duration-500 bg-gradient-to-tr ${getVibeGlow()}`}
          style={{
            opacity: state === 'speaking' ? 0.85 : state === 'listening' ? 0.6 : 0.25,
          }}
        />

        {/* Center Orb Icon & Label */}
        <div className="relative z-30 flex flex-col items-center justify-center space-y-2 pointer-events-none">
          {state === 'disconnected' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-300 group-hover:text-pink-300 group-hover:scale-110 transition-all">
                <Power className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-purple-200/80 uppercase">
                Tap to Wake
              </span>
            </>
          ) : state === 'connecting' ? (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-cyan-300 animate-spin">
                <Radio className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase animate-pulse">
                Connecting...
              </span>
            </>
          ) : state === 'speaking' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-pink-500/20 border border-pink-400/50 flex items-center justify-center text-pink-300">
                <Volume2 className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-pink-200 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                Zoya Speaking
              </span>
              <span className="text-[10px] text-pink-300/70 tracking-tight">
                Tap to interrupt
              </span>
            </>
          ) : (
            <>
              <div
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6 animate-pulse" />}
              </div>
              <span className="text-xs font-semibold tracking-wider text-cyan-200 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                {isMuted ? 'Mic Muted' : 'Listening...'}
              </span>
            </>
          )}
        </div>

        {/* Ambient Orbit Particle */}
        <div className="absolute top-3 right-5 w-2 h-2 rounded-full bg-white/70 blur-[1px] animate-pulse" />
      </button>

      {/* State Status Badges below Orb */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#141424]/80 border border-white/10 backdrop-blur-md">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'disconnected'
                ? 'bg-zinc-500'
                : state === 'connecting'
                ? 'bg-amber-400 animate-ping'
                : state === 'speaking'
                ? 'bg-pink-400 animate-pulse'
                : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span className="text-xs font-medium text-zinc-300 tracking-wide">
            {state === 'disconnected' && 'Standby • Ready'}
            {state === 'connecting' && 'Establishing Gemini Live Audio...'}
            {state === 'speaking' && 'Speaking in real-time'}
            {state === 'listening' && (isMuted ? 'Microphone Muted' : 'Mic active • Say anything')}
            {state === 'interrupted' && 'Interrupted'}
            {state === 'error' && 'Connection issue'}
          </span>
        </div>

        {state === 'disconnected' && (
          <p className="text-xs text-zinc-400/80 text-center max-w-xs animate-fade-in">
            Zoya is your sassy, witty, flirty companion. Speak freely in English or Hinglish!
          </p>
        )}
      </div>
    </div>
  );
};
