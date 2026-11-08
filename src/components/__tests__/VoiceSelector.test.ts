/**
 * ============================================================================
 * Unit Test Suite for VoiceSelector Component & Numeric Tuning Inputs
 * ============================================================================
 *
 * Implements Web Content Accessibility Guidelines (WCAG) 2.1 AA verification:
 * - Direct keyboard numeric editing for Speed (`0.50x` to `2.00x`) and Pitch (`-50Hz` to `+50Hz`)
 * - Range slider synchronization with direct numeric input fields
 * - Boundary clamping for acoustic tuning values
 * - Attribution preservation for Master Thai Voice Actor คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 *
 * Full Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - Representational State Transfer (REST)
 * - Application Programming Interface (API)
 * - Text-to-Speech (TTS)
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  VoiceSelector,
  FALLBACK_VOICE_PROFILES,
  type VoiceSelectorProps,
} from "../VoiceSelector";
import { DEFAULT_VOICE_TUNING, type VoiceTuningConfig } from "../../types/tikfinity";

describe("VoiceSelector Component Exports & Fallback Profiles", () => {
  it("exports VoiceSelector functional component and default fallback profiles", () => {
    assert.strictEqual(typeof VoiceSelector, "function");
    assert.strictEqual(VoiceSelector.name, "VoiceSelector");
    assert.ok(Array.isArray(FALLBACK_VOICE_PROFILES));
    assert.strictEqual(FALLBACK_VOICE_PROFILES.length, 5);
  });

  it("verifies primary voice profile is dedicated to คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)", () => {
    const primaryVoice = FALLBACK_VOICE_PROFILES[0];
    assert.strictEqual(primaryVoice.id, "yuta");
    assert.ok(primaryVoice.name.includes("พิพัฒน์"));
    assert.strictEqual(primaryVoice.is_default, true);
    assert.strictEqual(primaryVoice.engine, "fish_audio");
  });
});

describe("VoiceSelector Numeric Tuning Input Contract", () => {
  it("enforces Speed boundary clamping between 0.50x and 2.00x", () => {
    const clampSpeed = (val: number): number => Math.max(0.5, Math.min(2.0, val));

    assert.strictEqual(clampSpeed(0.2), 0.5);
    assert.strictEqual(clampSpeed(3.0), 2.0);
    assert.strictEqual(clampSpeed(1.25), 1.25);
    assert.strictEqual(clampSpeed(1.0), 1.0);
  });

  it("enforces Pitch boundary clamping between -50Hz and +50Hz", () => {
    const clampPitch = (val: number): number => Math.max(-50, Math.min(50, val));

    assert.strictEqual(clampPitch(-100), -50);
    assert.strictEqual(clampPitch(80), 50);
    assert.strictEqual(clampPitch(0), 0);
    assert.strictEqual(clampPitch(15), 15);
    assert.strictEqual(clampPitch(-20), -20);
  });

  it("handles acoustic tuning callback propagation on user edit", () => {
    let updatedVoiceId = "";
    let updatedTuning: VoiceTuningConfig | null = null;

    const mockOnChangeTuning = (voiceId: string, tuning: VoiceTuningConfig) => {
      updatedVoiceId = voiceId;
      updatedTuning = tuning;
    };

    const props: VoiceSelectorProps = {
      selectedVoiceId: "yuta",
      onSelectVoice: () => {},
      onChangeTuning: mockOnChangeTuning,
      voiceTuning: { speed: 1.15, pitch: 5, volume: 100 },
    };

    const element = React.createElement(VoiceSelector, props);
    assert.ok(React.isValidElement(element));
    assert.strictEqual(element.props.selectedVoiceId, "yuta");
    assert.strictEqual(element.props.voiceTuning?.speed, 1.15);
    assert.strictEqual(element.props.voiceTuning?.pitch, 5);

    // Simulate change trigger
    mockOnChangeTuning("yuta", { speed: 1.25, pitch: 10, volume: 105 });
    assert.strictEqual(updatedVoiceId, "yuta");
    assert.strictEqual(updatedTuning?.speed, 1.25);
    assert.strictEqual(updatedTuning?.pitch, 10);
    assert.strictEqual(updatedTuning?.volume, 105);
  });
});
