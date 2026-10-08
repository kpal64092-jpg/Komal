/**
 * AudioStreamer: Web Audio API playback for 24kHz raw PCM little-endian audio from Gemini Live.
 * Implements gapless scheduled playback, real-time AnalyserNode output, and instant interruption support.
 */

export class AudioStreamer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying: boolean = false;
  private onStateChange?: (isPlaying: boolean) => void;
  private checkInterval: any = null;

  constructor(onStateChange?: (isPlaying: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  public async init(): Promise<void> {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.updatePlaybackState();
      }, 50);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(1, avg / 128); // 0 to 1 normalized
  }

  /**
   * Schedules a raw PCM 16-bit 24kHz audio chunk for gapless playback.
   * @param base64Pcm Base64 encoded 16-bit little endian PCM data
   */
  public enqueueAudio(base64Pcm: string): void {
    if (!this.audioCtx || !this.analyser) {
      this.init();
    }
    if (!this.audioCtx || !this.analyser) return;

    try {
      // Decode base64 to binary byte array
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little endian into Float32 [-1.0, 1.0]
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      if (float32Array.length === 0) return;

      // Create AudioBuffer at 24kHz mono
      const audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      // Create BufferSourceNode
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      const currentTime = this.audioCtx.currentTime;
      // Schedule gaplessly
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.03; // small lead-in buffer to prevent underrun
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index !== -1) {
          this.activeSources.splice(index, 1);
        }
      };

      this.updatePlaybackState();
    } catch (err) {
      console.error('[AudioStreamer] Error decoding audio chunk:', err);
    }
  }

  /**
   * Interrupt playback immediately: stops active audio sources and flushes the queue.
   */
  public interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source might already have ended
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }
    this.updatePlaybackState();
  }

  private updatePlaybackState(): void {
    const isNowPlaying = this.activeSources.length > 0;
    if (isNowPlaying !== this.isPlaying) {
      this.isPlaying = isNowPlaying;
      if (this.onStateChange) {
        this.onStateChange(this.isPlaying);
      }
    }
  }

  public close(): void {
    this.interrupt();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
    this.analyser = null;
  }
}
