/**
 * StreamVox Live & TikFinity-style Text-to-Speech (TTS) Dashboard Type Definitions
 * Single-Page Application (SPA) configuration contract for real-time TikTok Live stream speech synthesis.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

export interface VoiceTuningConfig {
  speed: number;
  pitch: number;
  volume: number;
}

export const DEFAULT_VOICE_TUNING: VoiceTuningConfig = {
  speed: 1.0,
  pitch: 0,
  volume: 100,
};

export interface VoiceProfileInfo {
  id: string;
  name: string;
  description: string;
  engine: 'fish_audio' | 'edge_tts';
  model_id?: string | null;
  edge_voice?: string;
  is_default?: boolean;
  default_speed?: number;
  default_pitch?: number;
  default_volume?: number;
}

export interface TikFinitySettings {
  masterTtsEnabled: boolean;
  chatTtsEnabled: boolean;
  readUsername: boolean;
  antiSpamEnabled: boolean;
  maxCharacters: number;
  userCooldownSeconds: number;
  giftTtsEnabled: boolean;
  giftPriorityQueue: boolean;
  giftMinCoins: number;
  giftTemplate: string;
  bannedWords: string[];
  blacklistedUsers: string[];
  inDashboardAudio: boolean;
  volume: number;
  selectedVoiceId?: string;
  voiceTunings?: Record<string, VoiceTuningConfig>;
}

export interface QueueItem {
  id: string;
  username: string;
  text: string;
  isGift: boolean;
  giftName?: string;
  giftAmount?: number;
  coins?: number;
  timestamp: number;
  isTest?: boolean;
  voiceId?: string;
  tuning?: VoiceTuningConfig;
}

export const DEFAULT_TIKFINITY_SETTINGS: TikFinitySettings = {
  masterTtsEnabled: true,
  chatTtsEnabled: true,
  readUsername: true,
  antiSpamEnabled: true,
  maxCharacters: 120,
  userCooldownSeconds: 15,
  giftTtsEnabled: true,
  giftPriorityQueue: true,
  giftMinCoins: 1,
  giftTemplate: 'ขอบคุณคุณ {user} ที่ส่ง {amount}x {gift} ให้ยูตะนะครับ!',
  bannedWords: [],
  blacklistedUsers: [],
  inDashboardAudio: true,
  volume: 1.0,
  selectedVoiceId: 'yuta',
  voiceTunings: {},
};
