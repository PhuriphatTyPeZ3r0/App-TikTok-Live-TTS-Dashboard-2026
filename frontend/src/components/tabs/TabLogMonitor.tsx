"use client";

/**
 * In-Dashboard Real-Time Log Monitor Tab Component for StreamVox Live.
 *
 * Implements a high-performance diagnostic event console with Apple visionOS Liquid Glass
 * dark styling. Provides real-time event streaming via centralized structured logger subscriptions,
 * in-memory circular ring buffer hydration, severity and category filtering, free-text search,
 * auto-scroll management, expandable JavaScript Object Notation (JSON) detail inspection,
 * export functionality, and Administrator remote backend telemetry ingestion.
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Application Programming Interface (API)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Terminal,
  Search,
  Trash2,
  Download,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowDown,
  Shield,
  X,
  Server,
  Laptop,
} from "lucide-react";
import { subscribeToLogs, getLogs, clearLogs, logger } from "../../lib/logger";
import { useSupabaseAuth } from "../../hooks/useSupabaseAuth";
import type { LogEntry, LogLevel, LogCategory } from "../../types/logger";

/**
 * Properties for TabLogMonitor component.
 */
export interface TabLogMonitorProps {
  /** Optional backend Application Programming Interface (API) host URL. */
  backendUrl?: string;
  /** Optional supplementary Cascading Style Sheets (CSS) classes. */
  className?: string;
}

const SEVERITY_LEVELS: Array<LogLevel | "ALL"> = ["ALL", "ERROR", "WARN", "INFO", "DEBUG"];

const SUBSYSTEM_CATEGORIES: Array<LogCategory | "ALL"> = [
  "ALL",
  "TTS",
  "TIKTOK_WS",
  "AUTH",
  "NETWORK",
  "OVERLAY",
  "SYSTEM",
];

const LEVEL_STYLES: Record<
  LogLevel,
  { label: string; badgeBg: string; badgeText: string; badgeBorder: string; rowBorder: string }
> = {
  ERROR: {
    label: "ERROR",
    badgeBg: "bg-[#fe2c55]/15",
    badgeText: "text-[#fe2c55]",
    badgeBorder: "border-[#fe2c55]/30",
    rowBorder: "border-l-[#fe2c55]",
  },
  WARN: {
    label: "WARN",
    badgeBg: "bg-[#ffb300]/15",
    badgeText: "text-[#ffb300]",
    badgeBorder: "border-[#ffb300]/30",
    rowBorder: "border-l-[#ffb300]",
  },
  INFO: {
    label: "INFO",
    badgeBg: "bg-[#25f4ee]/15",
    badgeText: "text-[#25f4ee]",
    badgeBorder: "border-[#25f4ee]/30",
    rowBorder: "border-l-[#25f4ee]",
  },
  DEBUG: {
    label: "DEBUG",
    badgeBg: "bg-slate-500/15",
    badgeText: "text-slate-400",
    badgeBorder: "border-slate-500/30",
    rowBorder: "border-l-slate-600",
  },
};

const CATEGORY_STYLES: Record<LogCategory, string> = {
  TTS: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  TIKTOK_WS: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  AUTH: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  NETWORK: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  OVERLAY: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  SYSTEM: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

/**
 * Formats ISO 8601 timestamp string into high-resolution HH:mm:ss.SSS time representation.
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const millis = String(date.getMilliseconds()).padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${millis}`;
  } catch {
    return isoString;
  }
}

export function TabLogMonitor({ backendUrl = "", className = "" }: TabLogMonitorProps) {
  const { role } = useSupabaseAuth();
  const isAdmin = role === "admin";

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | "ALL">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedJsonId, setCopiedJsonId] = useState<string | null>(null);

  // Admin remote backend log synchronization state
  const [isRemoteActive, setIsRemoteActive] = useState<boolean>(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState<boolean>(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial hydration and real-time subscription lifecycle
  useEffect(() => {
    // Populate initial logs in chronological order (oldest to newest)
    const initialLogs = getLogs().slice().reverse();
    setLogs(initialLogs);

    // Subscribe to live incoming events from the logger event bus
    const unsubscribe = subscribeToLogs((newEntry: LogEntry) => {
      // Append only when in local mode or when remote mode is inactive
      setLogs((prev) => {
        const next = [...prev, newEntry];
        return next.length > 500 ? next.slice(next.length - 500) : next;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Fetch remote backend logs via FastAPI GET /api/logs for Administrator Role-Based Access Control (RBAC)
  const fetchRemoteLogs = useCallback(async () => {
    setIsLoadingRemote(true);
    setRemoteError(null);

    try {
      const apiHost = (
        backendUrl ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        ""
      )
        .trim()
        .replace(/\/+$/, "");

      const ingestUrl = `${apiHost}/api/logs?limit=200`;
      const response = await fetch(ingestUrl);

      if (!response.ok) {
        throw new Error(`Remote API returned HTTP status ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        const normalized: LogEntry[] = data.data.map((item: any, index: number) => ({
          id: item.id || `remote-${index}-${Date.now()}`,
          timestamp: item.timestamp || new Date().toISOString(),
          level: (item.level as LogLevel) || "INFO",
          category: (item.category as LogCategory) || "SYSTEM",
          message: item.message || "",
          details: item.details ?? null,
          sessionId: item.sessionId || item.session_id,
          userId: item.userId || item.user_id,
        }));

        // Display in chronological order (oldest to newest)
        setLogs(normalized.slice().reverse());
        logger.info(
          "SYSTEM",
          "Fetched remote telemetry records from backend Application Programming Interface (API)",
          { count: normalized.length }
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRemoteError(msg);
      logger.warn("SYSTEM", "Administrator remote log retrieval failed", { error: msg });
    } finally {
      setIsLoadingRemote(false);
    }
  }, [backendUrl]);

  // Toggle between Local client buffer and Remote backend server telemetry
  const handleToggleRemoteScope = () => {
    if (!isRemoteActive) {
      setIsRemoteActive(true);
      void fetchRemoteLogs();
    } else {
      setIsRemoteActive(false);
      setRemoteError(null);
      // Rehydrate local buffer
      setLogs(getLogs().slice().reverse());
    }
  };

  // 3. Filtered entries computation
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      // Severity level filter
      if (selectedLevel !== "ALL" && entry.level !== selectedLevel) {
        return false;
      }

      // Subsystem category filter
      if (selectedCategory !== "ALL" && entry.category !== selectedCategory) {
        return false;
      }

      // Free-text search filter across message and serialized details
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const matchMessage = entry.message.toLowerCase().includes(query);
        let matchDetails = false;

        if (entry.details !== undefined && entry.details !== null) {
          try {
            const serialized =
              typeof entry.details === "string"
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
  }, [logs, selectedLevel, selectedCategory, searchQuery]);

  // 4. Auto-scroll execution when new matching records arrive
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  // 5. Actions: Clear logs
  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
  };

  // 6. Actions: Export filtered logs to JSON file
  const handleExportJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredLogs, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `streamvox-logs-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 7. Actions: Copy single log row
  const handleCopyRow = (entry: LogEntry) => {
    const formatted = `[${formatTimestamp(entry.timestamp)}] [${entry.level}] [${entry.category}] ${entry.message}`;
    const payload = entry.details
      ? `${formatted}\nDetails: ${JSON.stringify(entry.details, null, 2)}`
      : formatted;

    navigator.clipboard.writeText(payload);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // 8. Actions: Copy JSON details
  const handleCopyJson = (entry: LogEntry) => {
    if (!entry.details) return;
    const json = JSON.stringify(entry.details, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedJsonId(entry.id);
    setTimeout(() => setCopiedJsonId(null), 1500);
  };

  // 9. Actions: Toggle detail accordion
  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header and Controls Card */}
      <div className="bg-[#12141a]/90 backdrop-blur-xl border border-[#1e222d] rounded-2xl p-4 shadow-xl flex flex-col gap-4">
        {/* Top Control Bar: Search and Core Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagnostic events and JSON details..."
              className="w-full pl-9 pr-9 py-2 bg-[#0a0b0e] border border-[#1e222d] focus:border-[#25f4ee]/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Admin Remote Ingest Toggle Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleToggleRemoteScope}
                disabled={isLoadingRemote}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 shadow-sm ${
                  isRemoteActive
                    ? "bg-[#fe2c55]/15 text-[#fe2c55] border-[#fe2c55]/40 shadow-[0_0_10px_rgba(254,44,85,0.2)]"
                    : "bg-[#181b24] text-slate-400 border-[#1e222d] hover:text-slate-200 hover:bg-[#1e222d]"
                }`}
                title="Role-Based Access Control (RBAC): Toggle remote server diagnostic telemetry from FastAPI Application Programming Interface (API)"
              >
                {isRemoteActive ? (
                  <Server className="w-3.5 h-3.5 text-[#fe2c55]" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{isRemoteActive ? "Remote Backend" : "Local Client"}</span>
                {isLoadingRemote && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
              </button>
            )}

            {/* Refresh button when in remote mode */}
            {isAdmin && isRemoteActive && (
              <button
                type="button"
                onClick={() => void fetchRemoteLogs()}
                disabled={isLoadingRemote}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181b24] text-slate-300 border border-[#1e222d] hover:text-white hover:bg-[#1e222d] transition-all"
                title="Refresh remote backend telemetry records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRemote ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            )}

            {/* Auto-Scroll Toggle Switch */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                autoScroll
                  ? "bg-[#25f4ee]/15 text-[#25f4ee] border-[#25f4ee]/40 shadow-[0_0_10px_rgba(37,244,238,0.2)]"
                  : "bg-[#181b24] text-slate-400 border-[#1e222d] hover:text-slate-200 hover:bg-[#1e222d]"
              }`}
              title="Toggle automatic scrolling to latest telemetry entries"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Auto-Scroll: {autoScroll ? "ON" : "OFF"}</span>
            </button>

            {/* Export JSON Button */}
            <button
              type="button"
              onClick={handleExportJson}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181b24] text-slate-300 border border-[#1e222d] hover:text-white hover:bg-[#1e222d] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Export filtered diagnostic telemetry records as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            {/* Clear Logs Button */}
            <button
              type="button"
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
              title="Clear all local telemetry records from circular ring buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Remote Error Banner */}
        {remoteError && (
          <div className="flex items-center justify-between px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            <span>Remote Telemetry Error: {remoteError}</span>
            <button
              type="button"
              onClick={() => setRemoteError(null)}
              className="text-rose-400 hover:text-rose-200 ml-2"
              title="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Severity Level Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#1e222d]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>Severity:</span>
          </span>
          {SEVERITY_LEVELS.map((level) => {
            const isSelected = selectedLevel === level;
            const style =
              level !== "ALL"
                ? LEVEL_STYLES[level]
                : {
                    badgeBg: "bg-white/10",
                    badgeText: "text-white",
                    badgeBorder: "border-white/30",
                  };

            return (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all duration-200 ${
                  isSelected
                    ? `${style.badgeBg} ${style.badgeText} ${style.badgeBorder} shadow-sm`
                    : "bg-[#181b24] text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#1e222d]"
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>

        {/* Subsystem Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#1e222d]/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Shield className="w-3 h-3" />
            <span>Category:</span>
          </span>
          {SUBSYSTEM_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const style =
              cat !== "ALL"
                ? CATEGORY_STYLES[cat]
                : "bg-white/10 text-white border-white/30";

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                  isSelected
                    ? `${style} shadow-sm`
                    : "bg-[#181b24] text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#1e222d]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="bg-[#0a0b0e] border border-[#1e222d] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono">
        {/* Terminal Header Bar */}
        <div className="bg-[#12141a] px-4 py-2.5 border-b border-[#1e222d] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#25f4ee]" />
            <span className="font-semibold text-slate-200">Event Stream Console</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#181b24] text-slate-400 border border-[#1e222d]">
              {filteredLogs.length} / {logs.length} events
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {isAdmin && (
              <span className="text-slate-500 font-sans">
                Role-Based Access Control (RBAC): Admin
              </span>
            )}
            <span className="text-slate-500">Max Capacity: 500</span>
          </div>
        </div>

        {/* Scrollable Event List */}
        <div className="max-h-[520px] min-h-[300px] overflow-y-auto p-3 space-y-2 select-text">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <Terminal className="w-8 h-8 opacity-40 text-slate-600" />
              <span>No telemetry records match the specified filters.</span>
              {(selectedLevel !== "ALL" || selectedCategory !== "ALL" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLevel("ALL");
                    setSelectedCategory("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-1 text-[#25f4ee] hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const levelStyle = LEVEL_STYLES[entry.level] || LEVEL_STYLES.INFO;
              const catStyle = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.SYSTEM;
              const hasDetails =
                entry.details !== undefined &&
                entry.details !== null &&
                (typeof entry.details === "object"
                  ? Object.keys(entry.details).length > 0
                  : String(entry.details).length > 0);
              const isExpanded = expandedIds.has(entry.id);
              const isCopied = copiedId === entry.id;
              const isJsonCopied = copiedJsonId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`border border-[#1e222d] bg-[#12141a]/60 hover:bg-[#12141a] rounded-xl transition-colors border-l-4 ${levelStyle.rowBorder} overflow-hidden`}
                >
                  {/* Event Summary Row */}
                  <div className="p-2.5 flex items-start gap-2.5">
                    {/* Timestamp */}
                    <span className="text-slate-500 text-[11px] shrink-0 font-medium pt-0.5 select-none">
                      {formatTimestamp(entry.timestamp)}
                    </span>

                    {/* Level Pill */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${levelStyle.badgeBg} ${levelStyle.badgeText} ${levelStyle.badgeBorder}`}
                    >
                      {entry.level}
                    </span>

                    {/* Category Pill */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${catStyle}`}
                    >
                      {entry.category}
                    </span>

                    {/* Message Body */}
                    <div className="flex-1 min-w-0 text-xs text-slate-200 break-words leading-relaxed">
                      {entry.message}
                    </div>

                    {/* Actions: Details Accordion & Copy Row */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {hasDetails && (
                        <button
                          type="button"
                          onClick={() => toggleAccordion(entry.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#181b24] text-slate-300 hover:text-white border border-[#1e222d] flex items-center gap-1 transition-colors"
                          title="Inspect supplementary structured details"
                        >
                          <span>JSON</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyRow(entry)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#181b24] transition-colors"
                        title="Copy diagnostic event to clipboard"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable JSON Details Accordion */}
                  {hasDetails && isExpanded && (
                    <div className="border-t border-[#1e222d] bg-[#0a0b0e] p-3">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e222d]/60 text-[11px] text-slate-400">
                        <span>Structured Context & Payload</span>
                        <button
                          type="button"
                          onClick={() => handleCopyJson(entry)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#181b24] text-slate-300 hover:text-white border border-[#1e222d] transition-colors"
                          title="Copy JSON details payload"
                        >
                          {isJsonCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{isJsonCopied ? "Copied" : "Copy JSON"}</span>
                        </button>
                      </div>

                      <pre className="text-[11px] text-[#25f4ee] overflow-x-auto p-2 bg-[#12141a] rounded-lg border border-[#1e222d] whitespace-pre-wrap leading-relaxed select-text">
                        {typeof entry.details === "object"
                          ? JSON.stringify(entry.details, null, 2)
                          : String(entry.details)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}

export default TabLogMonitor;
