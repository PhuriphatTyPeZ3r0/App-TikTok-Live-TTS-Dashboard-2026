/**
 * Structured Logging and Diagnostic contracts for StreamVox Live.
 *
 * Provides type contracts for in-dashboard real-time log monitoring, circular ring buffer
 * storage, and asynchronous log ingestion to PostgreSQL public.system_logs.
 */

/**
 * Diagnostic log severity levels.
 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/**
 * Functional subsystem categories for structured event routing.
 */
export type LogCategory =
  | 'TTS'
  | 'TIKTOK_WS'
  | 'AUTH'
  | 'NETWORK'
  | 'OVERLAY'
  | 'SYSTEM';

/**
 * Standard structured log entry contract.
 */
export interface LogEntry {
  /** Unique log entry identifier (UUID or high-resolution timestamp string). */
  id: string;
  /** ISO 8601 formatted timestamp string. */
  timestamp: string;
  /** Severity level classification. */
  level: LogLevel;
  /** Subsystem category origin. */
  category: LogCategory;
  /** Human-readable event description message. */
  message: string;
  /** Supplementary context, error stack traces, or payload parameters. */
  details?: Record<string, any> | string | number | boolean | null;
  /** Active live stream session identifier. */
  sessionId?: string;
  /** Supabase authenticated user Universally Unique Identifier (UUID). */
  userId?: string;
}

/**
 * In-dashboard log query filter specification.
 */
export interface LogFilter {
  /** Minimum or specific log levels to display. */
  levels?: LogLevel[];
  /** Subsystem categories to include. */
  categories?: LogCategory[];
  /** Free-text search query across message and details. */
  searchQuery?: string;
  /** Optional start ISO 8601 timestamp cutoff. */
  startTime?: string;
}
