import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useTikFinitySettings, TIKFINITY_STORAGE_KEY } from '../useTikFinitySettings';
import { DEFAULT_TIKFINITY_SETTINGS } from '../../types/tikfinity';

// Setup minimal DOM mock required for React 19 createRoot in Node.js test environment
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

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

const mockWindow: any = {
  HTMLIFrameElement: class {},
  Element: class {},
  HTMLElement: class {},
  Document: class {},
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: mockStorage,
};

const mockDoc: any = {
  nodeType: 9,
  nodeName: '#document',
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
  createTextNode: () => ({ nodeType: 3, nodeName: '#text' }),
  documentElement: { style: {} },
};

mockWindow.document = mockDoc;
(global as any).window = mockWindow;
(global as any).document = mockDoc;
(global as any).localStorage = mockStorage;

// Hook test runner helper
interface HookResult<T> {
  current: T;
}

function renderHook<T>(hookFn: () => T) {
  const container: any = {
    nodeType: 1,
    tagName: 'DIV',
    nodeName: 'DIV',
    ownerDocument: mockDoc,
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    removeChild: () => {},
    insertBefore: () => {},
    style: {},
  };

  const result = {} as HookResult<T>;
  function TestComponent() {
    result.current = hookFn();
    return null;
  }

  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(TestComponent));
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

describe('useTikFinitySettings Hook', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('initializes with DEFAULT_TIKFINITY_SETTINGS when localStorage is empty', () => {
    const { result } = renderHook(() => useTikFinitySettings());
    assert.deepStrictEqual(result.current.settings, DEFAULT_TIKFINITY_SETTINGS);
    assert.strictEqual(result.current.isLoaded, true);
  });

  test('updateSettings updates state and persists merged settings to localStorage', () => {
    const { result } = renderHook(() => useTikFinitySettings());

    act(() => {
      result.current.updateSettings({
        maxCharacters: 200,
        masterTtsEnabled: false,
        bannedWords: ['spam', 'abuse'],
      });
    });

    assert.strictEqual(result.current.settings.maxCharacters, 200);
    assert.strictEqual(result.current.settings.masterTtsEnabled, false);
    assert.deepStrictEqual(result.current.settings.bannedWords, ['spam', 'abuse']);
    // Check unaffected keys remain default
    assert.strictEqual(result.current.settings.userCooldownSeconds, 15);
    assert.strictEqual(result.current.settings.volume, 1.0);

    // Verify localStorage persistence
    const savedRaw = mockStorage.getItem(TIKFINITY_STORAGE_KEY);
    assert.ok(savedRaw, 'Expected item to be saved in localStorage');
    const parsed = JSON.parse(savedRaw!);
    assert.strictEqual(parsed.maxCharacters, 200);
    assert.strictEqual(parsed.masterTtsEnabled, false);
    assert.deepStrictEqual(parsed.bannedWords, ['spam', 'abuse']);
  });

  test('resetDefaults restores default settings and updates localStorage', () => {
    const { result } = renderHook(() => useTikFinitySettings());

    act(() => {
      result.current.updateSettings({
        volume: 0.25,
        antiSpamEnabled: false,
      });
    });

    assert.strictEqual(result.current.settings.volume, 0.25);
    assert.strictEqual(result.current.settings.antiSpamEnabled, false);

    act(() => {
      result.current.resetDefaults();
    });

    assert.deepStrictEqual(result.current.settings, DEFAULT_TIKFINITY_SETTINGS);

    const savedRaw = mockStorage.getItem(TIKFINITY_STORAGE_KEY);
    assert.ok(savedRaw);
    assert.deepStrictEqual(JSON.parse(savedRaw!), DEFAULT_TIKFINITY_SETTINGS);
  });

  test('hydrates pre-existing settings from localStorage on mount', () => {
    const preExisting = {
      ...DEFAULT_TIKFINITY_SETTINGS,
      giftMinCoins: 50,
      readUsername: false,
      giftTemplate: 'ยินดีด้วยคุณ {user}',
    };
    mockStorage.setItem(TIKFINITY_STORAGE_KEY, JSON.stringify(preExisting));

    const { result } = renderHook(() => useTikFinitySettings());

    assert.strictEqual(result.current.settings.giftMinCoins, 50);
    assert.strictEqual(result.current.settings.readUsername, false);
    assert.strictEqual(result.current.settings.giftTemplate, 'ยินดีด้วยคุณ {user}');
    assert.strictEqual(result.current.isLoaded, true);
  });

  test('gracefully recovers if localStorage contains corrupted JSON', () => {
    mockStorage.setItem(TIKFINITY_STORAGE_KEY, '{ invalid_json :::');

    const { result } = renderHook(() => useTikFinitySettings());

    // Should fall back to DEFAULT_TIKFINITY_SETTINGS without throwing
    assert.deepStrictEqual(result.current.settings, DEFAULT_TIKFINITY_SETTINGS);
    assert.strictEqual(result.current.isLoaded, true);
  });
});
