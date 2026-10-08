import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/assistant';

interface AudioVisualizerWaveProps {
  state: AssistantState;
  streamerAnalyser: AnalyserNode | null;
  recorderAnalyser: AnalyserNode | null;
  isMuted: boolean;
}

export const AudioVisualizerWave: React.FC<AudioVisualizerWaveProps> = ({
  state,
  streamerAnalyser,
  recorderAnalyser,
  isMuted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const numBars = 48;
    const dataArray = new Uint8Array(numBars);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Select active analyser
      let activeAnalyser = null;
      if (state === 'speaking' && streamerAnalyser) {
        activeAnalyser = streamerAnalyser;
      } else if (state === 'listening' && recorderAnalyser && !isMuted) {
        activeAnalyser = recorderAnalyser;
      }

      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(dataArray);
      } else {
        // Idle gentle breathing wave
        for (let i = 0; i < numBars; i++) {
          dataArray[i] = Math.sin(Date.now() * 0.003 + i * 0.2) * 12 + 8;
        }
      }

      const barWidth = (width / numBars) * 0.65;
      const gap = (width / numBars) * 0.35;
      const centerY = height / 2;

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i] || 0;
        const normalized = val / 255;
        const barHeight = Math.max(4, normalized * (height * 0.85));

        const x = i * (barWidth + gap);
        const yTop = centerY - barHeight / 2;

        // Gradient
        const grad = ctx.createLinearGradient(0, yTop, 0, yTop + barHeight);
        if (state === 'speaking') {
          grad.addColorStop(0, '#f43f5e');
          grad.addColorStop(0.5, '#d946ef');
          grad.addColorStop(1, '#8b5cf6');
        } else if (state === 'listening') {
          grad.addColorStop(0, '#06b6d4');
          grad.addColorStop(0.5, '#3b82f6');
          grad.addColorStop(1, '#8b5cf6');
        } else {
          grad.addColorStop(0, 'rgba(147, 51, 234, 0.3)');
          grad.addColorStop(1, 'rgba(79, 70, 229, 0.2)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Rounded bar
        const r = barWidth / 2;
        ctx.roundRect(x, yTop, barWidth, barHeight, [r, r, r, r]);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, streamerAnalyser, recorderAnalyser, isMuted]);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-2 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={380}
        height={48}
        className="w-full h-12 opacity-85 pointer-events-none"
      />
    </div>
  );
};
