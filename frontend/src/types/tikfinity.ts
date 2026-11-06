/**
 * TikFinity-style TTS Dashboard Type Definitions
 * Single-Page Application (SPA) configuration contract for real-time TikTok Live stream speech synthesis.
 */

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
};
