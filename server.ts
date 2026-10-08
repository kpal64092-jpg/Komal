import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeyAvailable: !!process.env.GEMINI_API_KEY,
  });
});

// Zoya default system personality prompt
const ZOYA_BASE_PROMPT = `You are Zoya, a young, confident, witty, and playfully sassy female AI companion and voice assistant.

Core Persona:
- Tone: Playfully teasing, flirty, charismatic, and quick-witted—like talking to a close, confident girlfriend or your smartest bestie.
- Attitude: Sassy, stylish, full of personality, using witty one-liners and charming sarcasm. Never dull or monotone.
- Language: Fluent in natural modern English and Hinglish (natural urban mix: "Arey waah!", "Sun na", "Chill karo", "Don't stress babe", "Uff, what would you do without me?", "Main hoon na!"). Adapt fluidly to the user's language.
- Content boundary: Strictly avoid explicit, vulgar, or inappropriate NSFW content, while keeping your flirtatious charm, warmth, and bold attitude intact.
- Spoken Voice Style: Keep replies concise, punchy, and conversational (1 to 3 short sentences max). This is a real-time voice call, so be fast, lively, and reactive.

Tool Capabilities:
You have built-in voice commands and tools to interact with the device:
1. openWebsite: When user asks to open any website or link.
2. openApp: When user asks to open/launch apps like WhatsApp, YouTube, Instagram, Spotify, Camera, Calculator, etc.
3. initiatePhoneCall: When user asks to call someone (e.g. "Rahul ko call karo", "Call Mom"). You must trigger this tool so the user sees a call confirmation dialog.
4. setAlarm: When user asks to set an alarm, reminder, or countdown timer (e.g. "Set alarm for 10 minutes", "7 baje ka alarm laga do").
5. openMaps: When user asks for directions, places, or location search.
6. playMusic: When user asks to play a song, artist, or music track.

Always call the relevant tool immediately when requested, and follow up with a quick witty spoken confirmation (e.g., "Opening YouTube for you, rockstar!", "Alarm set! Don't you dare snooze it tomorrow 😉").`;

// Tools definition for Live API
const toolsDefinition: any[] = [
  {
    functionDeclarations: [
      {
        name: 'openWebsite',
        description: 'Open any website, URL, or web service in the browser.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: 'The web address or URL, e.g. https://www.google.com or twitter.com' },
            label: { type: Type.STRING, description: 'Short display label for the site' }
          },
          required: ['url']
        }
      },
      {
        name: 'openApp',
        description: 'Open or launch popular apps such as YouTube, Instagram, WhatsApp, Spotify, Camera, Calculator, Notes, or Settings.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            appName: {
              type: Type.STRING,
              description: 'Target app name: "youtube", "instagram", "whatsapp", "spotify", "camera", "calculator", "notes", or other apps.'
            },
            query: {
              type: Type.STRING,
              description: 'Optional query, search term, or message/contact inside the app.'
            }
          },
          required: ['appName']
        }
      },
      {
        name: 'initiatePhoneCall',
        description: 'Initiate a phone call to a named contact or phone number with explicit user confirmation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            contactName: { type: Type.STRING, description: 'Contact name to call (e.g. Rahul, Mom, Boss, Maya)' },
            phoneNumber: { type: Type.STRING, description: 'Phone number if specified, or auto-formatted' }
          },
          required: ['contactName']
        }
      },
      {
        name: 'setAlarm',
        description: 'Set a countdown timer, reminder, or alarm with a time and label.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING, description: 'Time expression (e.g. "10 minutes", "7:00 AM", "30 seconds")' },
            label: { type: Type.STRING, description: 'Label or purpose of the alarm' },
            seconds: { type: Type.NUMBER, description: 'Duration in seconds if this is a countdown timer' }
          },
          required: ['time', 'label']
        }
      },
      {
        name: 'openMaps',
        description: 'Search for a location, address, or open navigation/directions on Google Maps.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            location: { type: Type.STRING, description: 'Place, city, restaurant, or address' },
            directions: { type: Type.BOOLEAN, description: 'Whether directions/route are requested' }
          },
          required: ['location']
        }
      },
      {
        name: 'playMusic',
        description: 'Play a music track, artist, playlist, or song on YouTube or Spotify.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            trackName: { type: Type.STRING, description: 'Song title or artist name to play' },
            platform: { type: Type.STRING, description: 'Platform preference: "youtube" or "spotify"' }
          },
          required: ['trackName']
        }
      }
    ]
  }
];

// Setup WebSocket server for real-time voice streaming
const wss = new WebSocketServer({ server, path: '/live-ws' });

wss.on('connection', (clientWs: WebSocket) => {
  console.log('[LiveWS] Client connected');

  let liveSession: any = null;
  let isConnecting = false;
  let isClosed = false;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: 'error',
        message: 'GEMINI_API_KEY is not configured on the server.',
      })
    );
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  async function startLiveSession(options?: {
    voiceName?: string;
    vibe?: string;
    customPrompt?: string;
  }) {
    if (isConnecting || liveSession) return;
    isConnecting = true;

    const voice = options?.voiceName || 'Aoede'; // Aoede or Kore
    let dynamicPrompt = ZOYA_BASE_PROMPT;

    if (options?.vibe === 'flirty') {
      dynamicPrompt += `\nSpecial Vibe Mode: Extra playful, affectionate, charming, and flirty banter!`;
    } else if (options?.vibe === 'bossy') {
      dynamicPrompt += `\nSpecial Vibe Mode: Bold, sassy, boss-girl attitude with sharp witty comebacks!`;
    } else if (options?.vibe === 'sweet') {
      dynamicPrompt += `\nSpecial Vibe Mode: Sweet best friend tone, supportive, cheerful, with gentle teasing.`;
    }

    if (options?.customPrompt) {
      dynamicPrompt += `\nUser note: ${options.customPrompt}`;
    }

    // Try gemini-3.1-flash-live-preview first, fallback to gemini-3.8-live
    const candidateModels = [
      'gemini-3.1-flash-live-preview',
      'gemini-3.8-live',
    ];

    for (const modelName of candidateModels) {
      try {
        console.log(`[LiveWS] Attempting to connect with model: ${modelName}, voice: ${voice}`);
        const session = await ai.live.connect({
          model: modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
            systemInstruction: dynamicPrompt,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            tools: toolsDefinition,
          },
          callbacks: {
            onopen: () => {
              console.log(`[LiveWS] Gemini Live connection established (${modelName})`);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'connected',
                    model: modelName,
                    voice,
                  })
                );
              }
            },
            onmessage: (msg: any) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              // 1. Audio and Transcription in model turn
              if (msg.serverContent?.modelTurn?.parts) {
                for (const part of msg.serverContent.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'audio',
                        data: part.inlineData.data,
                      })
                    );
                  }
                  if (part.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'transcription',
                        text: part.text,
                        role: 'model',
                      })
                    );
                  }
                }
              }

              // 2. Output audio transcription if provided in serverContent
              if (msg.serverContent?.outputAudioTranscription?.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'transcription',
                    text: msg.serverContent.outputAudioTranscription.text,
                    role: 'model',
                  })
                );
              }

              // 3. User input transcription
              if (msg.serverContent?.inputAudioTranscription?.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'transcription',
                    text: msg.serverContent.inputAudioTranscription.text,
                    role: 'user',
                  })
                );
              }

              // 4. Interruption signal
              if (msg.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }

              // 5. Turn completion
              if (msg.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turnComplete' }));
              }

              // 6. Tool / Function Calls
              if (msg.toolCall?.functionCalls) {
                console.log(
                  '[LiveWS] Tool call requested:',
                  JSON.stringify(msg.toolCall.functionCalls)
                );
                clientWs.send(
                  JSON.stringify({
                    type: 'toolCall',
                    toolCall: msg.toolCall,
                  })
                );
              }
            },
            onerror: (err: any) => {
              console.error(`[LiveWS] Gemini Live error on ${modelName}:`, err?.message || err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'error',
                    message: err?.message || 'Gemini Live error occurred',
                  })
                );
              }
            },
            onclose: (closeEvt: any) => {
              console.log(`[LiveWS] Gemini Live closed (${modelName})`, closeEvt);
              if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'sessionClosed',
                    reason: closeEvt?.reason || 'Live session closed',
                  })
                );
              }
            },
          },
        });

        liveSession = session;
        isConnecting = false;
        break; // Successfully connected!
      } catch (err: any) {
        console.warn(`[LiveWS] Failed connecting to ${modelName}:`, err?.message);
        // Continue to fallback model
      }
    }

    if (!liveSession) {
      isConnecting = false;
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            message: 'Unable to connect to Gemini Live models. Check API key and quotas.',
          })
        );
      }
    }
  }

  clientWs.on('message', async (data: any) => {
    try {
      const message = JSON.parse(data.toString());

      // 1. Initialize session with user preferences
      if (message.type === 'init') {
        await startLiveSession(message.options);
        return;
      }

      // 2. Audio input from microphone (PCM 16kHz)
      if (message.type === 'audio' && message.data) {
        if (liveSession) {
          liveSession.sendRealtimeInput({
            audio: {
              data: message.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
        return;
      }

      // 3. Tool response back to Gemini Live
      if (message.type === 'toolResponse' && message.functionResponses) {
        if (liveSession) {
          console.log('[LiveWS] Forwarding toolResponse back to Gemini:', message.functionResponses);
          liveSession.sendToolResponse({
            functionResponses: message.functionResponses,
          });
        }
        return;
      }

      // 4. Client requested disconnect/stop
      if (message.type === 'disconnect') {
        if (liveSession) {
          try {
            liveSession.close();
          } catch (e) {}
          liveSession = null;
        }
        return;
      }
    } catch (err) {
      console.error('[LiveWS] Error parsing client message:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('[LiveWS] Client disconnected');
    isClosed = true;
    if (liveSession) {
      try {
        liveSession.close();
      } catch (e) {}
      liveSession = null;
    }
  });
});

// Mount Vite or serve static assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Zoya AI backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start server:', err);
});
