/**
 * AudioRecorder: Microphone capture at 16kHz with PCM16 little-endian streaming and AnalyserNode.
 */

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isRecording: boolean = false;
  private isMuted: boolean = false;
  private onAudioData: (base64Pcm: string) => void;

  constructor(onAudioData: (base64Pcm: string) => void) {
    this.onAudioData = onAudioData;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    // Request mic stream with AEC and noise suppression
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtxClass({ sampleRate: 16000 });

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // Setup input analyser for real-time visualization of user speech
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.7;

    // Script processor node for raw PCM buffer capture
    this.processorNode = this.audioCtx.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!this.isRecording || this.isMuted) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16Buffer = this.floatTo16BitPCM(inputData);
      const base64 = this.arrayBufferToBase64(pcm16Buffer);

      if (base64) {
        this.onAudioData(base64);
      }
    };

    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.processorNode);
    // Connect to destination to keep processing alive in Web Audio spec
    this.processorNode.connect(this.audioCtx.destination);

    this.isRecording = true;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioLevel(): number {
    if (!this.analyser || this.isMuted) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(1, avg / 128);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stop(): void {
    this.isRecording = false;

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (e) {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }

    this.analyser = null;
  }

  /**
   * Converts Float32 [-1.0, 1.0] samples to 16-bit signed PCM little-endian ArrayBuffer
   */
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  /**
   * Encodes ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
