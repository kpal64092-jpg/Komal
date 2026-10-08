export type AssistantState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'interrupted'
  | 'error';

export type PersonalityVibe = 'sassy' | 'flirty' | 'bossy' | 'sweet';

export type VoicePersona = 'Aoede' | 'Kore';

export interface VibeConfig {
  id: PersonalityVibe;
  name: string;
  badge: string;
  description: string;
  color: string;
  glowColor: string;
  tagline: string;
}

export interface AppIntentData {
  appName: string;
  query?: string;
  directUrl?: string;
  icon?: string;
}

export interface PhoneCallRequest {
  id: string;
  contactName: string;
  phoneNumber?: string;
  status: 'pending' | 'calling' | 'declined';
  timestamp: number;
}

export interface AlarmItem {
  id: string;
  label: string;
  timeStr: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRinging: boolean;
  createdAt: number;
}

export interface ActionHistoryItem {
  id: string;
  toolName: string;
  summary: string;
  timestamp: number;
  details?: Record<string, any>;
  status: 'executed' | 'pending';
}

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, any>;
}
