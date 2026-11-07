/**
 * Centralized Structured Diagnostic Logger & Event Bus for StreamVox Live.
 *
 * Implements a high-performance in-memory circular ring buffer (First-In, First-Out (FIFO)
 * eviction capped at 500 items), an Event-Driven Architecture (EDA) subscriber mechanism
 * for real-time User Interface (UI) telemetry monitoring, and non-blocking asynchronous
 * telemetry dispatch to the FastAPI Application Programming Interface (API) backend and
 * Supabase PostgreSQL system_logs table with Row Level Security (RLS).
 *
 * Adheres to strict academic rigor and zero-emoji compliance directives.
 */

import type { LogCategory, LogEntry, LogFilter, LogLevel } from '../types/logger';
import { getSupabaseBrowserClient } from './supabase/client';

/** Maximum in-memory telemetry entries before circular FIFO buffer eviction. */
const MAX_RING_BUFFER_CAPACITY = 500;

/** Internal in-memory circular ring buffer holding recent diagnostic events. */
const ringBuffer: LogEntry[] = [];

/** Active real-time event bus listener callbacks for dashboard UI subscribers. */
type LogListener = (entry: LogEntry) => void;
const subscriberListeners = new Set<LogListener>();

/** Active live stream session Universally Unique Identifier (UUID) context. */
let activeSessionId: string | null = null;

/** Supabase authenticated user Universally Unique Identifier (UUID) context. */
let activeUserId: string | null = null;

/** Flag indicating whether browser window error listeners have been registered. */
let globalListenersRegistered = false;

/**
 * Generates an RFC 4122 compliant Universally Unique Identifier (UUID) v4 string.
 * Falls back to high-resolution timestamp entropy if crypto.randomUUID is unavailable.
 */
function generateLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Dispatches an asynchronous, non-blocking telemetry payload to remote diagnostic collectors.
 *
 * Transports structured log entries to:
 * 1. FastAPI REST API endpoint (POST /api/logs).
 * 2. Supabase PostgreSQL `system_logs` table (if user authenticated and client configured).
 *
 * Wrapped in fail-safe error isolation to guarantee caller execution is never disrupted.
 */
async function dispatchRemoteTelemetry(entry: LogEntry): Promise<void> {
  // Asynchronous remote dispatch must never block client rendering or throw uncaught errors
  try {
    const apiHost = (
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      ''
    ).trim().replace(/\/+$/, '');
    const ingestUrl = `${apiHost}/api/logs`;

    // 1. Post to FastAPI Backend Log Ingestion Endpoint
    fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    }).catch((networkError: unknown) => {
      // Intentionally isolate network transport failures to prevent UI disruption
      if (process.env.NODE_ENV === 'development') {
        console.debug('[StreamVox Logger] Backend ingest transport offline:', networkError);
      }
    });

    // 2. Post to Supabase system_logs table if client is initialized
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const authResponse = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const session = authResponse?.data?.session;

      if (session?.user?.id) {
        try {
          await supabase.from('system_logs').insert({
            user_id: session.user.id,
            session_id: entry.sessionId ?? null,
            level: entry.level,
            category: entry.category,
            message: entry.message,
            details: entry.details ?? null,
          });
        } catch (dbError: unknown) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[StreamVox Logger] Supabase database ingest skipped:', dbError);
          }
        }
      }
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[StreamVox Logger] Remote telemetry dispatch exception isolated:', error);
    }
  }
}

/**
 * Echoes diagnostic events to the browser development console with subsystem categorization.
 */
function logToBrowserConsole(entry: LogEntry): void {
  const prefix = `[StreamVox][${entry.category}][${entry.level}] ${entry.message}`;
  const details = entry.details !== undefined && entry.details !== null ? entry.details : '';

  switch (entry.level) {
    case 'ERROR':
      console.error(prefix, details);
      break;
    case 'WARN':
      console.warn(prefix, details);
      break;
    case 'DEBUG':
      console.debug(prefix, details);
      break;
    case 'INFO':
    default:
      console.info(prefix, details);
      break;
  }
}

/**
 * Core log creation and distribution pipeline.
 *
 * Populates UUID identifiers, ISO 8601 UTC timestamps, enforces ring buffer capacity,
 * invokes real-time UI subscriber callbacks, and dispatches remote telemetry on ERROR level.
 */
function recordLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: Record<string, any> | string | number | boolean | null
): LogEntry {
  const entry: LogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details: details !== undefined ? details : null,
    sessionId: activeSessionId ?? undefined,
    userId: activeUserId ?? undefined,
  };

  // Push to circular ring buffer with FIFO eviction at max capacity
  ringBuffer.push(entry);
  if (ringBuffer.length > MAX_RING_BUFFER_CAPACITY) {
    ringBuffer.shift();
  }

  // Broadcast event to active UI event bus subscribers
  subscriberListeners.forEach((listener) => {
    try {
      listener(entry);
    } catch (listenerError: unknown) {
      console.warn('[StreamVox Logger] Subscriber listener callback threw an exception:', listenerError);
    }
  });

  // Developer console output
  logToBrowserConsole(entry);

  // Trigger non-blocking asynchronous remote telemetry dispatch on critical ERROR severity
  if (level === 'ERROR') {
    void dispatchRemoteTelemetry(entry);
  }

  return entry;
}

/**
 * Subscribes a listener callback function to live incoming structured log events.
 *
 * @param listener Callback function receiving each newly recorded LogEntry.
 * @returns Unsubscribe closure function to remove the listener and prevent memory leaks.
 */
export function subscribeToLogs(listener: LogListener): () => void {
  subscriberListeners.add(listener);
  return () => {
    subscriberListeners.delete(listener);
  };
}

/**
 * Retrieves historical structured logs from the circular ring buffer.
 * Logs are returned in reverse-chronological order (newest events first),
 * with optional filtering by severity levels, subsystem categories, and text query.
 */
export function getLogs(filter?: LogFilter): LogEntry[] {
  // Create reverse-chronological clone (latest first)
  const reversed = [...ringBuffer].reverse();

  if (!filter) {
    return reversed;
  }

  return reversed.filter((entry) => {
    // 1. Severity level filter
    if (filter.levels && filter.levels.length > 0) {
      if (!filter.levels.includes(entry.level)) {
        return false;
      }
    }

    // 2. Subsystem category filter
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(entry.category)) {
        return false;
      }
    }

    // 3. Temporal start cutoff filter
    if (filter.startTime) {
      const entryTime = new Date(entry.timestamp).getTime();
      const cutoffTime = new Date(filter.startTime).getTime();
      if (!isNaN(entryTime) && !isNaN(cutoffTime) && entryTime < cutoffTime) {
        return false;
      }
    }

    // 4. Free-text search across message and supplementary details
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const query = filter.searchQuery.trim().toLowerCase();
      const matchMessage = entry.message.toLowerCase().includes(query);
      let matchDetails = false;
      if (entry.details !== undefined && entry.details !== null) {
        try {
          const serialized =
            typeof entry.details === 'string'
              ? entry.details
              : JSON.stringify(entry.details);
          matchDetails = serialized.toLowerCase().includes(query);
        } catch {
          matchDetails = String(entry.details).toLowerCase().includes(query);
        }
      }
      if (!matchMessage && !matchDetails) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Standard alias for getLogs conforming to dashboard log monitor consumers.
 */
export const getLogHistory = getLogs;

/**
 * Clears all retained log entries from the in-memory circular ring buffer.
 */
export function clearLogs(): void {
  ringBuffer.length = 0;
}

/**
 * Sets the active live stream session identifier for context enrichment.
 */
export function setSessionId(sessionId: string | null): void {
  activeSessionId = sessionId;
}

/**
 * Sets the active Supabase authenticated user identifier for context enrichment.
 */
export function setUserId(userId: string | null): void {
  activeUserId = userId;
}

/**
 * Manually flushes an arbitrary log entry to remote backend ingest endpoints.
 */
export async function flushRemoteLog(entry: LogEntry): Promise<void> {
  await dispatchRemoteTelemetry(entry);
}

/**
 * Registers global browser error handlers for uncaught exceptions and unhandled Promise rejections.
 * Emits structured telemetry records under the SYSTEM category.
 */
function registerGlobalBrowserErrorHandlers(): void {
  if (globalListenersRegistered || typeof window === 'undefined') {
    return;
  }

  globalListenersRegistered = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    recordLogEntry('ERROR', 'SYSTEM', event.message || 'Uncaught browser script execution exception', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const reasonMessage = reason instanceof Error ? reason.message : String(reason);
    let safeReason: string;
    try {
      safeReason = typeof reason === 'object' ? JSON.stringify(reason) : String(reason);
    } catch {
      safeReason = String(reason);
    }
    recordLogEntry('ERROR', 'SYSTEM', `Unhandled asynchronous Promise rejection: ${reasonMessage}`, {
      stack: reason instanceof Error ? reason.stack : undefined,
      rawReason: safeReason,
    });
  });
}

// Automatically bind global listeners when executing in browser runtime
if (typeof window !== 'undefined') {
  registerGlobalBrowserErrorHandlers();
}

/**
 * Singleton Structured Diagnostic Logger instance providing standard severity logging methods.
 */
export const logger = {
  info(
    category: LogCategory,
    message: string,
    details?: Record<string, any> | string | number | boolean | null
  ): LogEntry {
    return recordLogEntry('INFO', category, message, details);
  },

  warn(
    category: LogCategory,
    message: string,
    details?: Record<string, any> | string | number | boolean | null
  ): LogEntry {
    return recordLogEntry('WARN', category, message, details);
  },

  error(
    category: LogCategory,
    message: string,
    details?: Record<string, any> | string | number | boolean | null
  ): LogEntry {
    return recordLogEntry('ERROR', category, message, details);
  },

  debug(
    category: LogCategory,
    message: string,
    details?: Record<string, any> | string | number | boolean | null
  ): LogEntry {
    return recordLogEntry('DEBUG', category, message, details);
  },

  getLogs,
  getLogHistory,
  clearLogs,
  setSessionId,
  setUserId,
  subscribe: subscribeToLogs,
  subscribeToLogs,
  flushRemoteLog,
};

export default logger;
