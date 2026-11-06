/**
 * Type contracts and data transfer interfaces for the TikTok Live Text-to-Speech (TTS) Dashboard.
 *
 * This module specifies type safety contracts between the FastAPI Asynchronous Server Gateway Interface (ASGI)
 * backend server and the Next.js 15 React frontend client over bidirectional WebSockets (WS) using
 * JavaScript Object Notation (JSON) serialization. Manages First-In, First-Out (FIFO) queue states.
 *
 * Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

/**
 * Item waiting in the First-In, First-Out (FIFO) speech synthesis queue.
 */
export interface QueueItem {
  id: string;
  user: string;
  text: string;
  is_gift: boolean;
  gift_name?: string;
  diamonds?: number;
  timestamp: number;
  priority: boolean;
}

/**
 * Item currently being synthesized or broadcast over WebSockets (WS).
 */
export interface SpeakingItem {
  id: string;
  user: string;
  text: string;
  engine: string;
}

/**
 * Real-time operational statistics of the cloud Text-to-Speech (TTS) streaming session.
 */
export interface DashboardStats {
  total_synthesized: number;
  current_queue_size: number;
  active_engine: string;
  connected_clients: number;
  colab_tunnel_url?: string | null;
  prefer_colab_tts?: boolean;
}

/**
 * Google Colab Cloudflare Quick Tunnel runtime configuration.
 */
export interface ColabSettings {
  colab_tunnel_url: string | null;
  prefer_colab_tts: boolean;
  colab_tts_timeout_seconds: number;
}

/**
 * Discriminative union of inbound/outbound real-time WebSocket (WS) event envelopes.
 */
export type DashboardEventType =
  | "STATUS_UPDATE"
  | "EVENT_MESSAGE"
  | "EVENT_GIFT"
  | "CONTROL_FLUSH"
  | "PONG";

export interface DashboardEvent {
  type: DashboardEventType;
  data?: any;
  user?: string;
  text?: string;
  gift_name?: string | null;
  gift_count?: number;
  diamonds?: number;
  engine?: string;
  audio_base64?: string;
  timestamp?: number;
}

/**
 * Configuration options for the `useDashboardSocket` React custom hook.
 */
export interface UseDashboardSocketOptions {
  /** Target session Universally Unique Identifier (UUID). */
  sessionId: string;
  /** Privileged streamer admin authorization token. */
  adminToken: string;
  /** Base HTTP/HTTPS backend URL (e.g., http://localhost:8000 or https://api.domain.com). */
  backendUrl?: string;
  /** Explicit WebSocket (WS/WSS) URL base override. If omitted, derived from backendUrl or window.location. */
  wsUrl?: string;
  /** Whether the socket should automatically connect on mount. Defaults to true. */
  enabled?: boolean;
  /** Optional callback invoked on every inbound WebSocket event envelope. */
  onEvent?: (event: DashboardEvent) => void;
  /** Optional callback invoked when the backend rejects authentication with 1008 Policy Violation or 403 Forbidden. */
  onUnauthorized?: () => void;
}

/**
 * State and action handlers exposed by the `useDashboardSocket` React custom hook.
 */
export interface UseDashboardSocketReturn {
  /** Whether the WebSocket (WS) connection is currently active and open. */
  isConnected: boolean;
  /** Whether the hook is currently in an exponential backoff reconnect attempt cycle. */
  isReconnecting: boolean;
  /** Number of consecutive reconnection attempts performed since last disconnect. */
  reconnectAttempts: number;
  /** First-In, First-Out (FIFO) queue of pending synthesized speech messages. */
  queue: QueueItem[];
  /** Currently playing speech synthesis item, or null if idle. */
  speakingItem: SpeakingItem | null;
  /** Aggregated operational metrics and active engine state. */
  stats: DashboardStats;
  /** Active Google Colab Cloudflare tunnel settings. */
  colabSettings: ColabSettings;
  /** Error message string if connection or API request fails. */
  error: string | null;
  /** Emergency purge action dispatching CONTROL_FLUSH over WebSockets (WS). */
  sendControlFlush: () => void;
  /** Trigger on-demand voice synthesis test. */
  testVoice: (text?: string) => Promise<boolean>;
  /** Update and synchronize Google Colab tunnel settings with the ASGI server. */
  updateColabSettings: (settings: Partial<ColabSettings>) => Promise<boolean>;
  /** Remove or skip a specific item from the local First-In, First-Out (FIFO) queue. */
  skipItem: (itemId: string) => void;
  /** Manually establish or re-establish the WebSocket (WS) connection. */
  connect: () => void;
  /** Gracefully terminate the WebSocket (WS) connection. */
  disconnect: () => void;
  /** Skip current audio playback on the server and broadcast control_skip. */
  skipAudio: () => void;
  /** Pause audio playback on the server and broadcast control_pause. */
  pauseAudio: () => void;
  /** Resume paused audio playback on the server and broadcast control_resume. */
  resumeAudio: () => void;
  /** Purge the playback queue on the server and broadcast control_clear. */
  clearQueue: () => void;
}
