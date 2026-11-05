"use client";

/**
 * Real-Time WebSocket (WS) Hook and State Management for TikTok Live Text-to-Speech (TTS).
 *
 * This hook establishes a resilient, bidirectional WebSockets (WS) connection to the FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend server. It orchestrates real-time
 * event communication using JavaScript Object Notation (JSON), maintaining local First-In, First-Out (FIFO)
 * audio synthesis queues, automated exponential backoff reconnection, and keep-alive heartbeats.
 *
 * Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ColabSettings,
  DashboardEvent,
  DashboardStats,
  QueueItem,
  SpeakingItem,
  UseDashboardSocketOptions,
  UseDashboardSocketReturn,
} from "../types/dashboard";

/**
 * Default operational statistics for initial state before server handshake.
 */
const DEFAULT_STATS: DashboardStats = {
  total_synthesized: 0,
  current_queue_size: 0,
  active_engine: "Edge-TTS (พิพัฒน์ บุญสิทธิเลิศ)",
  connected_clients: 1,
  colab_tunnel_url: null,
  prefer_colab_tts: true,
};

/**
 * Default Google Colab Cloudflare Quick Tunnel settings.
 */
const DEFAULT_COLAB_SETTINGS: ColabSettings = {
  colab_tunnel_url: null,
  prefer_colab_tts: true,
  colab_tts_timeout_seconds: 5.0,
};

/**
 * Translate HTTP/HTTPS origin to WS/WSS protocol dynamically.
 *
 * @param backendUrl Optional base HTTP(S) URL.
 * @param wsUrlOverride Explicit WebSocket URL base override.
 * @returns Fully qualified WebSocket URL base (e.g. ws://localhost:8000 or wss://domain.com).
 */
export function resolveWebSocketUrl(
  backendUrl?: string,
  wsUrlOverride?: string
): string {
  if (wsUrlOverride) {
    return wsUrlOverride.replace(/\/+$/, "");
  }

  if (backendUrl) {
    return backendUrl
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:")
      .replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  return "ws://localhost:8000";
}

/**
 * React custom hook providing real-time WebSockets (WS) synchronization and controls.
 *
 * Implements exponential backoff:
 * Delay formula: Math.min(1000 * Math.pow(2, attempt), 16000)
 *
 * @param options Hook configuration including sessionId and adminToken.
 * @returns State properties and interactive action dispatchers.
 */
export function useDashboardSocket({
  sessionId,
  adminToken,
  backendUrl = "",
  wsUrl,
  enabled = true,
}: UseDashboardSocketOptions): UseDashboardSocketReturn {
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [speakingItem, setSpeakingItem] = useState<SpeakingItem | null>(null);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [colabSettings, setColabSettings] =
    useState<ColabSettings>(DEFAULT_COLAB_SETTINGS);

  // Stable references for timer IDs and WebSocket instance
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  /**
   * Safely dispatch a JavaScript Object Notation (JSON) payload over the active socket.
   */
  const sendJson = useCallback((payload: Record<string, any>) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  /**
   * Clear any scheduled reconnection timeout.
   */
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Clear periodic heartbeat ping interval.
   */
  const clearHeartbeatInterval = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Disconnect and release the WebSocket (WS) connection.
   */
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    clearHeartbeatInterval();

    if (socketRef.current) {
      // Avoid firing onclose reconnect handler during intentional disconnect
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    if (isMountedRef.current) {
      setIsConnected(false);
      setIsReconnecting(false);
    }
  }, [clearReconnectTimeout, clearHeartbeatInterval]);

  /**
   * Establish WebSocket (WS) connection with exponential backoff fault recovery.
   */
  const connect = useCallback(() => {
    if (!sessionId || !adminToken) {
      setError("Missing sessionId or adminToken for WebSocket authorization");
      return;
    }

    // Terminate existing connection if open
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    clearReconnectTimeout();

    const baseUrl = resolveWebSocketUrl(backendUrl, wsUrl);
    const endpoint = `${baseUrl}/ws/dashboard/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(adminToken)}`;

    try {
      const ws = new WebSocket(endpoint);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setIsReconnecting(false);
        setError(null);
        attemptRef.current = 0;
        setReconnectAttempts(0);

        // Keep-alive heartbeat: ping every 25 seconds
        clearHeartbeatInterval();
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!isMountedRef.current) return;
        try {
          const payload: DashboardEvent = JSON.parse(event.data);

          // 1. Emergency Queue Purge (CONTROL_FLUSH)
          if (payload.type === "CONTROL_FLUSH") {
            setQueue([]);
            setSpeakingItem(null);
            setStats((prev) => ({ ...prev, current_queue_size: 0 }));
            return;
          }

          // 2. Real-time Status Update (STATUS_UPDATE)
          if (payload.type === "STATUS_UPDATE") {
            const data = payload.data || {};
            setStats((prev) => ({
              ...prev,
              total_synthesized:
                data.total_synthesized ?? prev.total_synthesized,
              current_queue_size:
                data.current_queue_size ?? prev.current_queue_size,
              active_engine: data.active_engine ?? prev.active_engine,
              connected_clients:
                data.connected_clients ?? prev.connected_clients,
              colab_tunnel_url:
                data.colab_tunnel_url !== undefined
                  ? data.colab_tunnel_url
                  : prev.colab_tunnel_url,
              prefer_colab_tts:
                data.prefer_colab_tts !== undefined
                  ? data.prefer_colab_tts
                  : prev.prefer_colab_tts,
            }));

            if (data.colab_tunnel_url !== undefined) {
              setColabSettings((prev) => ({
                ...prev,
                colab_tunnel_url: data.colab_tunnel_url,
                prefer_colab_tts:
                  data.prefer_colab_tts !== undefined
                    ? data.prefer_colab_tts
                    : prev.prefer_colab_tts,
              }));
            }
            return;
          }

          // 3. Normal Viewer Comment Event (EVENT_MESSAGE)
          if (payload.type === "EVENT_MESSAGE") {
            const raw = payload.data || payload;
            const newItem: QueueItem = {
              id:
                raw.id ||
                `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              user: raw.user || "Viewer",
              text: raw.text || "",
              is_gift: false,
              timestamp: raw.timestamp || Date.now(),
              priority: false,
            };

            // First-In, First-Out (FIFO) queue ingestion
            setQueue((prev) => [...prev, newItem]);
            setStats((prev) => ({
              ...prev,
              current_queue_size: prev.current_queue_size + 1,
            }));
            return;
          }

          // 4. Virtual Gift Superchat Event (EVENT_GIFT)
          if (payload.type === "EVENT_GIFT") {
            const raw = payload.data || payload;
            const newGiftItem: QueueItem = {
              id:
                raw.id ||
                `gift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              user: raw.user || "Gift Supporter",
              text: raw.text || `ส่งของขวัญ ${raw.gift_name || ""}`,
              is_gift: true,
              gift_name: raw.gift_name,
              diamonds: raw.diamonds || raw.gift_count || 1,
              timestamp: raw.timestamp || Date.now(),
              priority: true,
            };

            // High-priority items placed at the front of FIFO processing
            setQueue((prev) => [newGiftItem, ...prev]);
            setStats((prev) => ({
              ...prev,
              current_queue_size: prev.current_queue_size + 1,
            }));
            return;
          }

          // 5. Inbound synthesized speech broadcast (ALERT)
          if (
            (payload as any).type === "ALERT" ||
            Boolean((payload as any).audio_base64)
          ) {
            const alertPayload = payload as any;
            const item: SpeakingItem = {
              id: `speak-${Date.now()}`,
              user: alertPayload.user || "ระบบ",
              text: alertPayload.text || "",
              engine:
                alertPayload.engine ||
                "Fish Audio / Edge-TTS (พิพัฒน์ บุญสิทธิเลิศ)",
            };
            setSpeakingItem(item);
            setStats((prev) => ({
              ...prev,
              total_synthesized: prev.total_synthesized + 1,
              active_engine: item.engine,
            }));
            return;
          }

          // 6. Heartbeat Pong Keep-Alive Response
          if (payload.type === "PONG") {
            // Heartbeat validated
            return;
          }
        } catch (parseError) {
          console.warn(
            "[useDashboardSocket] Failed parsing inbound WebSocket JSON frame:",
            parseError
          );
        }
      };

      ws.onerror = (err) => {
        console.error("[useDashboardSocket] WebSocket connection error:", err);
        if (isMountedRef.current) {
          setError("WebSocket connection failed or interrupted");
        }
      };

      ws.onclose = () => {
        clearHeartbeatInterval();
        if (!isMountedRef.current) return;

        setIsConnected(false);
        setIsReconnecting(true);

        // Exponential backoff formula: Math.min(1000 * Math.pow(2, attempt), 16000)
        const attempt = attemptRef.current;
        const delay = Math.min(1000 * Math.pow(2, attempt), 16000);
        attemptRef.current += 1;
        setReconnectAttempts(attemptRef.current);

        console.info(
          `[useDashboardSocket] Reconnecting attempt ${attemptRef.current} in ${delay}ms...`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      };
    } catch (exc) {
      console.error(
        "[useDashboardSocket] Exception instantiating WebSocket:",
        exc
      );
      setError("Failed to create WebSocket instance");
    }
  }, [
    sessionId,
    adminToken,
    backendUrl,
    wsUrl,
    clearReconnectTimeout,
    clearHeartbeatInterval,
  ]);

  /**
   * Action: Emergency Flush all queue items.
   * Sends both CONTROL_FLUSH and emergency_flush actions for full backend compatibility.
   */
  const sendControlFlush = useCallback(() => {
    // Dispatch WS message
    sendJson({ action: "CONTROL_FLUSH" });
    sendJson({ action: "emergency_flush" });

    // Instantly purge local FIFO queue and reset speaking state
    setQueue([]);
    setSpeakingItem(null);
    setStats((prev) => ({ ...prev, current_queue_size: 0 }));

    // Also trigger REST API fallback if backendUrl or window origin is available
    if (typeof fetch !== "undefined") {
      const restUrl = `${backendUrl}/api/session/${encodeURIComponent(sessionId)}/flush?token=${encodeURIComponent(adminToken)}`;
      fetch(restUrl, { method: "POST" }).catch((err) =>
        console.warn("[useDashboardSocket] Flush REST fallback error:", err)
      );
    }
  }, [sendJson, backendUrl, sessionId, adminToken]);

  /**
   * Action: Trigger on-demand voice synthesis test.
   * POST to ${backendUrl}/api/session/test-voice and ${backendUrl}/api/session/${sessionId}/test_voice.
   */
  const testVoice = useCallback(
    async (text?: string): Promise<boolean> => {
      try {
        const payload = {
          sessionId,
          adminToken,
          text: text || "ทดสอบระบบเสียงสังเคราะห์ ติ๊กต็อกไลฟ์สำเร็จ",
        };

        // Try primary brief endpoint: /api/session/test-voice
        const endpointPrimary = `${backendUrl}/api/session/test-voice`;
        const resPrimary = await fetch(endpointPrimary, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
            "X-Admin-Token": adminToken,
          },
          body: JSON.stringify(payload),
        }).catch(() => null);

        if (resPrimary && resPrimary.ok) {
          return true;
        }

        // Fallback to backend route: /api/session/{sessionId}/test_voice?token={adminToken}
        const endpointFallback = `${backendUrl}/api/session/${encodeURIComponent(sessionId)}/test_voice?token=${encodeURIComponent(adminToken)}`;
        const resFallback = await fetch(endpointFallback, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": adminToken,
          },
          body: JSON.stringify(payload),
        });

        return resFallback.ok;
      } catch (err) {
        console.error("[useDashboardSocket] testVoice execution error:", err);
        return false;
      }
    },
    [backendUrl, sessionId, adminToken]
  );

  /**
   * Action: Update and synchronize Google Colab Cloudflare tunnel settings.
   */
  const updateColabSettings = useCallback(
    async (settings: Partial<ColabSettings>): Promise<boolean> => {
      try {
        const endpoint = `${backendUrl}/api/settings/colab?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(adminToken)}`;
        const bodyPayload = {
          colab_tunnel_url: settings.colab_tunnel_url,
          prefer_colab_tts: settings.prefer_colab_tts,
          colab_tts_timeout_seconds: settings.colab_tts_timeout_seconds,
          session_id: sessionId,
          admin_token: adminToken,
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
            "X-Admin-Token": adminToken,
          },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          const data = await res.json();
          setColabSettings((prev) => ({
            ...prev,
            colab_tunnel_url:
              data.colab_tunnel_url !== undefined
                ? data.colab_tunnel_url
                : settings.colab_tunnel_url ?? prev.colab_tunnel_url,
            prefer_colab_tts:
              data.prefer_colab_tts !== undefined
                ? data.prefer_colab_tts
                : settings.prefer_colab_tts ?? prev.prefer_colab_tts,
            colab_tts_timeout_seconds:
              data.colab_tts_timeout_seconds !== undefined
                ? data.colab_tts_timeout_seconds
                : settings.colab_tts_timeout_seconds ??
                  prev.colab_tts_timeout_seconds,
          }));

          setStats((prev) => ({
            ...prev,
            colab_tunnel_url:
              data.colab_tunnel_url !== undefined
                ? data.colab_tunnel_url
                : prev.colab_tunnel_url,
            prefer_colab_tts:
              data.prefer_colab_tts !== undefined
                ? data.prefer_colab_tts
                : prev.prefer_colab_tts,
          }));
          return true;
        }
        return false;
      } catch (err) {
        console.error(
          "[useDashboardSocket] updateColabSettings execution error:",
          err
        );
        return false;
      }
    },
    [backendUrl, sessionId, adminToken]
  );

  /**
   * Action: Remove or skip an item from the local First-In, First-Out (FIFO) queue.
   */
  const skipItem = useCallback((itemId: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== itemId));
    setSpeakingItem((current) => (current?.id === itemId ? null : current));
    setStats((prev) => ({
      ...prev,
      current_queue_size: Math.max(0, prev.current_queue_size - 1),
    }));
  }, []);

  // Lifecycle initialization
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && sessionId && adminToken) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [enabled, sessionId, adminToken, connect, disconnect]);

  return {
    isConnected,
    isReconnecting,
    reconnectAttempts,
    queue,
    speakingItem,
    stats,
    colabSettings,
    error,
    sendControlFlush,
    testVoice,
    updateColabSettings,
    skipItem,
    connect,
    disconnect,
  };
}
