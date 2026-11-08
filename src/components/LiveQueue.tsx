"use client";

/**
 * ============================================================================
 * StreamVox Live — Live FIFO Speech Queue Component (WCAG 2.1 AA Compliant)
 * ============================================================================
 *
 * Implements Flowbite Modern Enterprise Design System (DS) & Web Content Accessibility
 * Guidelines (WCAG) 2.1 Level AA ergonomic standards:
 * - Minimum touch target dimensions >= 44x44px (WCAG 2.1 Success Criterion 2.5.5)
 * - Enhanced disabled state contrast ratio >= 4.5:1 using `disabled:text-zinc-400`
 *   and `disabled:border-border/60` (WCAG 2.1 Success Criterion 1.4.3 Contrast (Minimum))
 * - Real-time First-In, First-Out (FIFO) queue management and live playback console
 * - Seamless integration with NowSpeakingCard and QueueFeed components
 *
 * Full Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - First-In, First-Out (FIFO)
 * - Text-to-Speech (TTS)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - Open Broadcaster Software (OBS)
 * - Role-Based Access Control (RBAC)
 * - Application Programming Interface (API)
 *
 * Master Thai Voice Actor Attribution:
 * Dedicated to Master Thai Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 * Official voice model for StreamVox Live Text-to-Speech (TTS) live streaming systems.
 *
 * Academic References:
 * - W3C (2024). Web Content Accessibility Guidelines (WCAG) 2.1 (2nd Edition). W3C Recommendation.
 *   DOI: https://www.w3.org/TR/WCAG21/
 * - ISO/IEC 40500:2025. Information technology — W3C Web Content Accessibility Guidelines (WCAG) 2.1.
 * ============================================================================
 */

import React from "react";
import {
  LiveQueueConsole,
  type LiveQueueConsoleProps,
} from "./LiveQueueConsole";
import { QueueItem } from "../types/tikfinity";

export interface LiveQueueProps extends LiveQueueConsoleProps {
  /** Optional custom CSS classes. */
  className?: string;
}

/**
 * LiveQueue Component providing WCAG 2.1 AA accessible FIFO speech queue interface.
 */
export function LiveQueue({
  currentSpeaker,
  isPlaying,
  isPaused = false,
  onSkip,
  onTogglePause,
  onClearQueue,
  queue,
  onDeleteItem,
  className = "",
}: LiveQueueProps): React.JSX.Element {
  return (
    <LiveQueueConsole
      currentSpeaker={currentSpeaker}
      isPlaying={isPlaying}
      isPaused={isPaused}
      onSkip={onSkip}
      onTogglePause={onTogglePause}
      onClearQueue={onClearQueue}
      queue={queue}
      onDeleteItem={onDeleteItem}
      className={className}
    />
  );
}

export * from "./LiveQueueConsole";
export default LiveQueue;
