"use client";

/**
 * LiveQueueConsole Component
 *
 * TikFinity-style Live Stream Speech Synthesis Console (Right Panel Container).
 * Assembles NowSpeakingCard (spotlight player, animated 8-bar waveform, skip/pause controls)
 * and QueueFeed (priority gift & chat queue with individual item deletion) into a cohesive panel.
 */

import React from "react";
import { QueueItem } from "../types/tikfinity";
import { NowSpeakingCard } from "./NowSpeakingCard";
import { QueueFeed } from "./QueueFeed";

export interface LiveQueueConsoleProps {
  currentSpeaker: QueueItem | null;
  isPlaying: boolean;
  isPaused?: boolean;
  onSkip: () => void;
  onTogglePause: () => void;
  onClearQueue: () => void;
  queue: QueueItem[];
  onDeleteItem: (id: string) => void;
  className?: string;
}

export function LiveQueueConsole({
  currentSpeaker,
  isPlaying,
  isPaused = false,
  onSkip,
  onTogglePause,
  onClearQueue,
  queue,
  onDeleteItem,
  className = "",
}: LiveQueueConsoleProps): React.JSX.Element {
  return (
    <div
      className={`flex flex-col gap-5 ${className}`}
      aria-label="Live Queue & Playback Console"
    >
      {/* Current Speaker Spotlight & Real-time Controls */}
      <NowSpeakingCard
        currentSpeaker={currentSpeaker}
        isPlaying={isPlaying}
        isPaused={isPaused}
        onSkip={onSkip}
        onTogglePause={onTogglePause}
        onClearQueue={onClearQueue}
      />

      {/* Priority Speech Synthesis Queue List */}
      <QueueFeed
        queue={queue}
        onDeleteItem={onDeleteItem}
        onClearQueue={onClearQueue}
      />
    </div>
  );
}

export default LiveQueueConsole;
