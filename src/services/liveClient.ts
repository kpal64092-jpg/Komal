import { AssistantState, PersonalityVibe, VoicePersona, ToolCallPayload } from '../types/assistant';
import { AudioRecorder } from './audioRecorder';
import { AudioStreamer } from './audioStreamer';

export interface LiveClientCallbacks {
  onStateChange: (state: AssistantState) => void;
  onTranscription: (text: string, role: 'model' | 'user') => void;
  onToolCall: (call: ToolCallPayload) => Promise<Record<string, any> | void>;
  onError: (errorMessage: string) => void;
  onAudioLevel?: (level: number, source: 'mic' | 'model') => void;
}

export class LiveClient {
  private ws: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private streamer: AudioStreamer | null = null;
  private state: AssistantState = 'disconnected';
  private callbacks: LiveClientCallbacks;
  private animFrameId: number | null = null;

  constructor(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): AssistantState {
    return this.state;
  }

  private setState(newState: AssistantState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }

  public async connect(options?: {
    voiceName?: VoicePersona;
    vibe?: PersonalityVibe;
    customPrompt?: string;
  }): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected' || this.state === 'listening' || this.state === 'speaking') {
      return;
    }

    this.setState('connecting');

    try {
      // 1. Initialize streamer
      this.streamer = new AudioStreamer((isPlaying) => {
        if (this.state === 'speaking' && !isPlaying) {
          this.setState('listening');
        } else if (isPlaying && this.state !== 'speaking') {
          this.setState('speaking');
        }
      });
      await this.streamer.init();

      // 2. Initialize recorder
      this.recorder = new AudioRecorder((base64Pcm) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'audio',
              data: base64Pcm,
            })
          );
        }
      });
      await this.recorder.start();

      // 3. Connect WebSocket to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live-ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[LiveClient] WebSocket opened, initializing Gemini Live session...');
        this.ws?.send(
          JSON.stringify({
            type: 'init',
            options: {
              voiceName: options?.voiceName || 'Aoede',
              vibe: options?.vibe || 'sassy',
              customPrompt: options?.customPrompt,
            },
          })
        );
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            console.log('[LiveClient] Live connected with model:', msg.model);
            this.setState('listening');
          } else if (msg.type === 'audio' && msg.data) {
            this.streamer?.enqueueAudio(msg.data);
          } else if (msg.type === 'transcription' && msg.text) {
            this.callbacks.onTranscription(msg.text, msg.role || 'model');
          } else if (msg.type === 'interrupted') {
            console.log('[LiveClient] Interrupted by user!');
            this.streamer?.interrupt();
            this.setState('listening');
          } else if (msg.type === 'toolCall' && msg.toolCall?.functionCalls) {
            await this.handleToolCalls(msg.toolCall.functionCalls);
          } else if (msg.type === 'error') {
            console.error('[LiveClient] Server error:', msg.message);
            this.callbacks.onError(msg.message || 'Live session error');
            this.setState('error');
          } else if (msg.type === 'sessionClosed') {
            console.log('[LiveClient] Session closed by server');
            this.disconnect();
          }
        } catch (err) {
          console.error('[LiveClient] Message handling error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[LiveClient] WebSocket error:', err);
        this.callbacks.onError('WebSocket connection error.');
        this.setState('error');
      };

      this.ws.onclose = () => {
        console.log('[LiveClient] WebSocket closed');
        if (this.state !== 'disconnected') {
          this.disconnect();
        }
      };

      // Start audio level visualizer polling loop
      this.startAudioLevelLoop();
    } catch (err: any) {
      console.error('[LiveClient] Connection initiation failed:', err);
      this.callbacks.onError(err?.message || 'Failed to start microphone or connect.');
      this.disconnect();
    }
  }

  private async handleToolCalls(functionCalls: any[]): Promise<void> {
    const responses: any[] = [];

    for (const call of functionCalls) {
      const payload: ToolCallPayload = {
        id: call.id,
        name: call.name,
        args: call.args || {},
      };

      try {
        const result = await this.callbacks.onToolCall(payload);
        responses.push({
          id: call.id,
          name: call.name,
          response: result || { status: 'success', executed: true },
        });
      } catch (e: any) {
        responses.push({
          id: call.id,
          name: call.name,
          response: { status: 'error', error: e?.message || 'Failed' },
        });
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN && responses.length > 0) {
      this.ws.send(
        JSON.stringify({
          type: 'toolResponse',
          functionResponses: responses,
        })
      );
    }
  }

  public interrupt(): void {
    if (this.streamer) {
      this.streamer.interrupt();
    }
    if (this.state === 'speaking') {
      this.setState('listening');
    }
    // Also notify server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  public setMuted(muted: boolean): void {
    if (this.recorder) {
      this.recorder.setMuted(muted);
    }
  }

  public isMuted(): boolean {
    return this.recorder?.getIsMuted() || false;
  }

  public getStreamerAnalyser(): AnalyserNode | null {
    return this.streamer?.getAnalyser() || null;
  }

  public getRecorderAnalyser(): AnalyserNode | null {
    return this.recorder?.getAnalyser() || null;
  }

  private startAudioLevelLoop(): void {
    const loop = () => {
      if (this.callbacks.onAudioLevel) {
        if (this.state === 'speaking' && this.streamer) {
          const lvl = this.streamer.getAudioLevel();
          this.callbacks.onAudioLevel(lvl, 'model');
        } else if (this.state === 'listening' && this.recorder) {
          const lvl = this.recorder.getAudioLevel();
          this.callbacks.onAudioLevel(lvl, 'mic');
        } else {
          this.callbacks.onAudioLevel(0, 'mic');
        }
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public disconnect(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }

    if (this.streamer) {
      this.streamer.close();
      this.streamer = null;
    }

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'disconnect' }));
        }
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.setState('disconnected');
  }
}
