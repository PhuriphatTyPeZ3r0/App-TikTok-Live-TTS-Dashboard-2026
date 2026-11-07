/**
 * Unit tests for useRenderAuth React Hook.
 *
 * Verifies:
 * 1. Initial unauthenticated state when no tokens are present.
 * 2. Role-Based Access Control (RBAC) determination ('admin' vs 'streamer').
 * 3. Local offline mockLogin dispatch for uninterrupted development.
 * 4. Logout session purge and state reset.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useRenderAuth } from '../useRenderAuth';
import type { RenderAuthState } from '../../types/auth';

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
  location: {
    search: '',
    href: 'http://localhost:3000/',
  },
  history: {
    replaceState: (_data: any, _title: string, url: string) => {
      mockWindow.location.href = url;
      mockWindow.location.search = url.includes('?') ? url.substring(url.indexOf('?')) : '';
    },
  },
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

describe('useRenderAuth React Hook', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockWindow.location.search = '';
    mockWindow.location.href = 'http://localhost:3000/';
  });

  test('initializes with unauthenticated guest state when no tokens exist', () => {
    const { result, unmount } = renderHook(() => useRenderAuth());

    assert.ok(result.current);
    assert.strictEqual(result.current.user, null);
    assert.strictEqual(result.current.token, null);
    assert.strictEqual(result.current.isAdmin, false);
    assert.strictEqual(result.current.role, null);

    unmount();
  });

  test('mockLogin creates admin session credentials correctly', () => {
    const { result, unmount } = renderHook(() => useRenderAuth());

    act(() => {
      result.current.mockLogin('admin');
    });

    assert.ok(result.current.user);
    assert.strictEqual(result.current.role, 'admin');
    assert.strictEqual(result.current.isAdmin, true);
    assert.strictEqual(result.current.user?.email, 'phuriphathem@gmail.com');
    assert.ok(result.current.token?.startsWith('mock-render-jwt-admin'));

    unmount();
  });

  test('logout purges credentials and resets state', () => {
    const { result, unmount } = renderHook(() => useRenderAuth());

    act(() => {
      result.current.mockLogin('streamer');
    });

    assert.strictEqual(result.current.role, 'streamer');
    assert.strictEqual(result.current.isAdmin, false);

    act(() => {
      result.current.logout();
    });

    assert.strictEqual(result.current.user, null);
    assert.strictEqual(result.current.token, null);
    assert.strictEqual(result.current.role, null);
    assert.strictEqual(result.current.isAdmin, false);

    unmount();
  });
});
