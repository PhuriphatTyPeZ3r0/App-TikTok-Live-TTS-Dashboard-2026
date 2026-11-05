"use client";

/**
 * ============================================================================
 * Apple visionOS Frosted Liquid Glass Audio Spectrum & Waveform Visualizer
 * ============================================================================
 *
 * This component renders an interactive, real-time audio visualization canvas
 * engineered for Next.js 15 Single-Page Application (SPA) dashboards.
 * It simulates Fast Fourier Transform (FFT) frequency spectrum distribution
 * and harmonic waveforms compatible with the Web Audio Application Programming Interface (Web Audio API) standard for High-Definition Audio (HD Audio).
 *
 * Dedicated to master voice actor: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 *
 * Architectural Features:
 * - High-Definition Audio (HD Audio) canvas rendering with window.devicePixelRatio scaling
 * - Fast Fourier Transform (FFT) synthetic multi-band spectrum with dynamic decay & smoothing
 * - Dual visual modes:
 *     1. Active Speech: Multi-frequency spectrum bars with overlaid continuous sine wave ribbon
 *     2. Idle Harmonic: Gentle breathing sinusoidal wave with soft alpha transparency (0.3)
 * - Apple visionOS Frosted Liquid Glass design system with specular highlights & reactive ambient glow
 * - Autonomous container responsiveness via ResizeObserver
 * ============================================================================
 */

import React, { useEffect, useRef } from "react";

export interface AudioVisualizerProps {
  /**
   * Indicates whether the Text-to-Speech (TTS) engine is currently synthesizing/speaking audio.
   */
  isSpeaking?: boolean;
  /**
   * Primary accent hex color code or Tailwind color string. Defaults to TikTok Cyan (#00f2fe).
   */
  accentColor?: string;
  /**
   * Additional Cascading Style Sheets (CSS) class names for custom layout customization.
   */
  className?: string;
  /**
   * Logical display height in pixels for the visualizer canvas. Defaults to 120px.
   */
  height?: number;
  /**
   * Number of frequency spectrum bars to render (typically 32 to 48 bins). Defaults to 36.
   */
  barCount?: number;
}

export function AudioVisualizer({
  isSpeaking = false,
  accentColor = "#00f2fe",
  className = "",
  height = 120,
  barCount = 36,
}: AudioVisualizerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep speaking state synchronized across animation frame iterations without recreating the loop
  const speakingRef = useRef<boolean>(isSpeaking);
  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    // Fast Fourier Transform (FFT) simulated frequency bins with temporal smoothing
    const currentLevels: number[] = new Array(barCount).fill(0.05);
    const targetLevels: number[] = new Array(barCount).fill(0.05);

    // Dynamic resolution handling accounting for High-DPI screens (e.g. Retina displays)
    const updateCanvasDimensions = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const rect = container.getBoundingClientRect();
      const logicalWidth = Math.max(rect.width, 200);
      const logicalHeight = height;

      canvas.width = Math.floor(logicalWidth * dpr);
      canvas.height = Math.floor(logicalHeight * dpr);
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    updateCanvasDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasDimensions();
    });
    resizeObserver.observe(container);

    /**
     * Continuous 60fps render loop simulating Web Audio Application Programming Interface
     * (Web Audio API) frequency analysis and Fast Fourier Transform (FFT) spectrum output.
     */
    const render = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const active = speakingRef.current;
      phase += active ? 0.08 : 0.025;

      if (active) {
        // ====================================================================
        // Active State: Multi-bar Fast Fourier Transform (FFT) Spectrum + Ribbon
        // ====================================================================

        // Generate synthetic FFT frequency targets with harmonic clustering
        for (let i = 0; i < barCount; i++) {
          const harmonicBias = Math.sin((i / barCount) * Math.PI); // Mid-frequency voice boost
          const noise = Math.random() * 0.45;
          const wave = Math.sin(phase * 1.5 + i * 0.3) * 0.25;
          targetLevels[i] = Math.max(0.1, Math.min(1.0, harmonicBias * 0.65 + wave + noise));
          // Exponential decay smoothing for realistic High-Definition Audio (HD Audio) meter physics
          currentLevels[i] += (targetLevels[i] - currentLevels[i]) * 0.22;
        }

        const totalSpacing = 4;
        const availableWidth = logicalWidth - 24; // padding
        const barWidth = Math.max(2, (availableWidth - (barCount - 1) * totalSpacing) / barCount);
        const startX = 12;
        const baselineY = logicalHeight - 16;
        const maxBarHeight = logicalHeight - 32;

        // Draw frequency spectrum bars with Apple visionOS gradient
        for (let i = 0; i < barCount; i++) {
          const x = startX + i * (barWidth + totalSpacing);
          const barHeight = Math.max(4, currentLevels[i] * maxBarHeight);
          const y = baselineY - barHeight;

          const gradient = ctx.createLinearGradient(x, baselineY, x, y);
          gradient.addColorStop(0, "#00f2fe"); // TikTok Cyan
          gradient.addColorStop(0.5, "#8b5cf6"); // Violet Accent
          gradient.addColorStop(1, "#fe2c55"); // TikTok Red Highlight

          ctx.fillStyle = gradient;
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 2, 2]);
          } else {
            ctx.rect(x, y, barWidth, barHeight);
          }
          ctx.fill();
        }

        // Overlaid high-frequency continuous sine waveform ribbon
        ctx.save();
        ctx.beginPath();
        const ribbonY = logicalHeight / 2 - 6;
        for (let x = 0; x <= logicalWidth; x += 3) {
          const freqMultiplier = 0.025;
          const amp = Math.sin(phase * 2.2 + x * freqMultiplier) * 14 * Math.sin((x / logicalWidth) * Math.PI);
          const y = ribbonY + amp;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        const ribbonGrad = ctx.createLinearGradient(0, 0, logicalWidth, 0);
        ribbonGrad.addColorStop(0, "rgba(0, 242, 254, 0.7)");
        ribbonGrad.addColorStop(0.5, "rgba(139, 92, 246, 0.9)");
        ribbonGrad.addColorStop(1, "rgba(254, 44, 85, 0.8)");

        ctx.strokeStyle = ribbonGrad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#00f2fe";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      } else {
        // ====================================================================
        // Idle State: Harmonic Breathing Sinusoidal Waveform (Subtle 0.3 Alpha)
        // ====================================================================
        const centerY = logicalHeight / 2;
        const waveCount = 3;

        for (let w = 0; w < waveCount; w++) {
          ctx.save();
          ctx.beginPath();
          const waveOffset = w * (Math.PI / 3);
          const waveAlpha = 0.3 - w * 0.08;

          for (let x = 0; x <= logicalWidth; x += 4) {
            const normalizedX = x / logicalWidth;
            const envelope = Math.sin(normalizedX * Math.PI); // Window envelope
            const waveY =
              centerY +
              Math.sin(normalizedX * 6 + phase + waveOffset) * 10 * envelope +
              Math.sin(normalizedX * 12 - phase * 0.6) * 4 * envelope;

            if (x === 0) {
              ctx.moveTo(x, waveY);
            } else {
              ctx.lineTo(x, waveY);
            }
          }

          const idleGradient = ctx.createLinearGradient(0, 0, logicalWidth, 0);
          idleGradient.addColorStop(0, `rgba(0, 242, 254, ${waveAlpha * 0.6})`);
          idleGradient.addColorStop(0.5, `rgba(139, 92, 246, ${waveAlpha})`);
          idleGradient.addColorStop(1, `rgba(254, 44, 85, ${waveAlpha * 0.7})`);

          ctx.strokeStyle = idleGradient;
          ctx.lineWidth = 2 - w * 0.4;
          ctx.stroke();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [height, barCount]);

  return (
    <div
      ref={containerRef}
      className={`liquid-glass specular-border rounded-2xl p-4 overflow-hidden relative transition-all duration-500 ${className}`}
    >
      {/* Ambient background glow reflecting real-time voice activity */}
      <div
        className={`ambient-glow absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          isSpeaking ? "opacity-100 scale-105" : "opacity-30 scale-100"
        }`}
        aria-hidden="true"
      />

      {/* Header telemetry label */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              isSpeaking
                ? "bg-[#00f2fe] shadow-[0_0_8px_#00f2fe] animate-pulse"
                : "bg-white/30"
            }`}
          />
          <span className="text-xs font-semibold tracking-wider uppercase text-white/70">
            {isSpeaking ? "Voice Synthesizer Active" : "Spectral Monitor Idle"}
          </span>
        </div>
        <div className="text-[10px] text-white/40 tracking-widest font-mono uppercase">
          HD Audio · FFT 36-Band
        </div>
      </div>

      {/* Primary rendering canvas */}
      <div className="relative z-10 flex justify-center items-center w-full">
        <canvas
          ref={canvasRef}
          className="block w-full rounded-lg"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
}

export default AudioVisualizer;
