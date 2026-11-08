/**
 * ============================================================================
 * Unit Test Suite for DashboardContext & DashboardProvider
 * ============================================================================
 *
 * Validates:
 * - Module exports and function signature for DashboardProvider and useDashboard
 * - Exception handling when useDashboard is invoked outside of a DashboardProvider
 * - Initial state contracts for Next.js 15 Single-Page Application (SPA)
 * - State management for First-In, First-Out (FIFO) speech synthesis queues
 * - LocalStorage persistence for master Text-to-Speech (TTS) switch and voice selection
 * - Web Audio Application Programming Interface (Web Audio API) waveform contracts
 *
 * Dedicated to Master Thai Voice Actor:
 * คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 *
 * Full Academic Terminology & Acronyms:
 * - Single-Page Application (SPA)
 * - Text-to-Speech (TTS)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - WebSockets (WS)
 * - First-In, First-Out (FIFO)
 * - Fast Fourier Transform (FFT)
 * - Application Programming Interface (API)
 * ============================================================================
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  DashboardProvider,
  useDashboard,
  MASTER_TTS_STORAGE_KEY,
  VOICE_STORAGE_KEY,
  type DashboardContextType,
} from "../DashboardContext";

// Configure React 19 testing act environment
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

// Minimal in-memory storage mock for LocalStorage simulation
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get store() {
      return store;
    },
  };
})();

// Minimal DOM mock required for React 19 createRoot in Node.js test environment
const mockWindow: any = {
  HTMLIFrameElement: class {},
  Element: class {},
  HTMLElement: class {},
  Document: class {},
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: mockStorage,
  sessionStorage: mockStorage,
  location: {
    search: "",
    protocol: "http:",
    host: "localhost:3000",
  },
};

const mockDoc: any = {
  nodeType: 9,
  nodeName: "#document",
  ownerDocument: null,
  defaultView: mockWindow,
  activeElement: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: (tag: string) => ({
    nodeType: 1,
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    setAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
  createElementNS: (_ns: string, tag: string) => ({
    nodeType: 1,
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    setAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
  createTextNode: () => ({ nodeType: 3, nodeName: "#text" }),
  documentElement: { style: {} },
};

mockWindow.document = mockDoc;
(global as any).window = mockWindow;
(global as any).document = mockDoc;
(global as any).localStorage = mockStorage;
(global as any).sessionStorage = mockStorage;

// Offline fetch mock preventing external network access during unit test execution
(global as any).fetch = async (_url: string, _opts: any) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      has_active_session: false,
      audio_base64: "",
    }),
  };
};

interface HookResult<T> {
  current: T;
}

function renderDashboardHook<T>(hookFn: () => T) {
  const container: any = {
    nodeType: 1,
    tagName: "DIV",
    nodeName: "DIV",
    ownerDocument: mockDoc,
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    removeChild: () => {},
    insertBefore: () => {},
    style: {},
  };

  const result = {} as HookResult<T>;

  function TestConsumer() {
    result.current = hookFn();
    return null;
  }

  const root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(
        DashboardProvider,
        null,
        React.createElement(TestConsumer)
      )
    );
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe("DashboardContext & DashboardProvider Suite", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("exports DashboardProvider and useDashboard functions", () => {
    assert.strictEqual(typeof DashboardProvider, "function");
    assert.strictEqual(typeof useDashboard, "function");
    assert.strictEqual(MASTER_TTS_STORAGE_KEY, "streamvox_master_tts");
    assert.strictEqual(VOICE_STORAGE_KEY, "streamvox_voice_id");
  });

  it("throws descriptive error when useDashboard is used outside DashboardProvider", () => {
    // 1. Direct invocation outside React context
    assert.throws(
      () => {
        useDashboard();
      },
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(
          err.message,
          "useDashboard must be used within a DashboardProvider"
        );
        return true;
      }
    );

    // 2. Invocation inside a React component without DashboardProvider ancestor
    const container: any = {
      nodeType: 1,
      tagName: "DIV",
      nodeName: "DIV",
      ownerDocument: mockDoc,
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild: () => {},
      removeChild: () => {},
      insertBefore: () => {},
      style: {},
    };

    function NakedConsumer() {
      useDashboard();
      return null;
    }

    const root = createRoot(container);
    assert.throws(
      () => {
        act(() => {
          root.render(React.createElement(NakedConsumer));
        });
      },
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(
          err.message,
          "useDashboard must be used within a DashboardProvider"
        );
        return true;
      }
    );
  });

  it("provides comprehensive initial state when wrapped in DashboardProvider", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    assert.ok(result.current.backendUrl.includes("http"));
    assert.strictEqual(typeof result.current.sessionId, "string");
    assert.strictEqual(typeof result.current.adminToken, "string");
    assert.strictEqual(result.current.username, "");
    assert.strictEqual(result.current.masterTtsEnabled, true);
    assert.strictEqual(result.current.activeVoiceId, "yuta");
    assert.strictEqual(result.current.isSpeaking, false);
    assert.strictEqual(result.current.isPlaying, false);
    assert.strictEqual(result.current.isPaused, false);
    assert.strictEqual(result.current.currentSpeaker, null);
    assert.deepStrictEqual(result.current.queue, []);
    assert.strictEqual(Array.isArray(result.current.speechWaveformData), true);
    assert.strictEqual(result.current.speechWaveformData.length, 8);
    assert.strictEqual(result.current.showRoomModal, false);
    assert.strictEqual(result.current.sidebarCollapsed, false);
    assert.strictEqual(result.current.sidebarMobileOpen, false);

    unmount();
  });

  it("updates masterTtsEnabled and persists to localStorage streamvox_master_tts", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    act(() => {
      result.current.setMasterTtsEnabled(false);
    });

    assert.strictEqual(result.current.masterTtsEnabled, false);
    assert.strictEqual(mockStorage.getItem(MASTER_TTS_STORAGE_KEY), "false");

    act(() => {
      result.current.setMasterTtsEnabled(true);
    });

    assert.strictEqual(result.current.masterTtsEnabled, true);
    assert.strictEqual(mockStorage.getItem(MASTER_TTS_STORAGE_KEY), "true");

    unmount();
  });

  it("updates activeVoiceId and persists to localStorage streamvox_voice_id", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    act(() => {
      result.current.setActiveVoiceId("phiphat_pro");
    });

    assert.strictEqual(result.current.activeVoiceId, "phiphat_pro");
    assert.strictEqual(mockStorage.getItem(VOICE_STORAGE_KEY), "phiphat_pro");

    unmount();
  });

  it("manages paused queue operations: addQueueItem, deleteQueueItem, and clearQueue", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    // Pause playback so items accumulate deterministically in queue
    act(() => {
      result.current.togglePause();
    });
    assert.strictEqual(result.current.isPaused, true);

    act(() => {
      result.current.addQueueItem({
        id: "msg-101",
        username: "ViewerAlpha",
        text: "สวัสดีครับพี่ยูตะ",
        isGift: false,
      });
      result.current.addQueueItem({
        id: "msg-102",
        username: "ViewerBeta",
        text: "ส่งหัวใจให้ครับ",
        isGift: false,
      });
    });

    assert.strictEqual(result.current.queue.length, 2);
    assert.strictEqual(result.current.queue[0].username, "ViewerAlpha");
    assert.strictEqual(result.current.queue[1].username, "ViewerBeta");

    act(() => {
      result.current.deleteQueueItem("msg-101");
    });

    assert.strictEqual(result.current.queue.length, 1);
    assert.strictEqual(result.current.queue[0].id, "msg-102");

    act(() => {
      result.current.clearQueue();
    });

    assert.strictEqual(result.current.queue.length, 0);

    unmount();
  });

  it("manages playback lifecycle and skipCurrent dispatcher", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    act(() => {
      result.current.addQueueItem({
        id: "play-01",
        username: "ActiveSpeaker",
        text: "กำลังเล่นข้อความนี้",
        isGift: false,
      });
    });

    // When not paused, the first queued item is immediately dequeued to currentSpeaker
    assert.ok(result.current.currentSpeaker);
    assert.strictEqual(result.current.currentSpeaker?.username, "ActiveSpeaker");
    assert.strictEqual(result.current.isPlaying, true);
    assert.strictEqual(result.current.isSpeaking, true);

    act(() => {
      result.current.skipCurrent();
    });

    assert.strictEqual(result.current.currentSpeaker, null);
    assert.strictEqual(result.current.isPlaying, false);
    assert.strictEqual(result.current.isSpeaking, false);

    unmount();
  });

  it("triggers testVoice by adding a test QueueItem to the pipeline", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    act(() => {
      result.current.testVoice("yuta", "ทดสอบระบบเสียง");
    });

    // Check that either currentSpeaker or queue contains the audition item
    const hasAuditionItem =
      (result.current.currentSpeaker && result.current.currentSpeaker.isTest) ||
      result.current.queue.some((item) => item.isTest);

    assert.strictEqual(Boolean(hasAuditionItem), true);

    unmount();
  });

  it("toggles pause state when togglePause is called", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    assert.strictEqual(result.current.isPaused, false);

    act(() => {
      result.current.togglePause();
    });

    assert.strictEqual(result.current.isPaused, true);

    act(() => {
      result.current.togglePause();
    });

    assert.strictEqual(result.current.isPaused, false);

    unmount();
  });

  it("updates voice tuning configurations via updateActiveTuning and updateVoiceTuning", () => {
    const { result, unmount } = renderDashboardHook(() => useDashboard());

    act(() => {
      result.current.updateActiveTuning({ speed: 1.25, pitch: 2 });
    });

    const activeTuning = result.current.voiceTunings[result.current.activeVoiceId];
    assert.ok(activeTuning);
    assert.strictEqual(activeTuning.speed, 1.25);
    assert.strictEqual(activeTuning.pitch, 2);

    act(() => {
      result.current.updateVoiceTuning("custom_voice", { volume: 80 });
    });

    assert.strictEqual(result.current.voiceTunings["custom_voice"].volume, 80);

    unmount();
  });
});
