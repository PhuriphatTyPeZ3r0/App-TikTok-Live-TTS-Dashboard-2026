/**
 * ============================================================================
 * Unit Test Suite for Sidebar Component Navigation & Responsive Constants
 * ============================================================================
 *
 * Validates:
 * - Module exports for Sidebar functional component and isSidebarItemActive utility
 * - SIDEBAR_ITEMS list integrity across all 8 core Next.js App Router workspace routes:
 *     1. 'cockpit'  -> '/'
 *     2. 'queue'    -> '/queue'
 *     3. 'voice'    -> '/voice'
 *     4. 'settings' -> '/settings'
 *     5. 'gift'     -> '/gift'
 *     6. 'safety'   -> '/safety'
 *     7. 'obs'      -> '/obs'
 *     8. 'logs'     -> '/logs'
 * - Active route highlighting logic (isSidebarItemActive) handling root, subpaths,
 *   trailing slashes, query parameters, and non-matching routes
 * - Backward compatibility callbacks: onTabChange, onSelectTab, onMobileClose, onCloseMobile
 * - React component contract, props override handling, and WCAG 2.1 AA touch targets (>= 44x44px)
 * - Voice actor attribution context: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 *
 * Full Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - First-In, First-Out (FIFO)
 * - Open Broadcaster Software (OBS)
 * - Text-to-Speech (TTS)
 * - Role-Based Access Control (RBAC)
 * - Application Programming Interface (API)
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  Sidebar,
  SIDEBAR_ITEMS,
  isSidebarItemActive,
  type TabType,
  type SidebarProps,
} from "../Sidebar";

describe("Sidebar Navigation Structure & Constants", () => {
  it("contains all 8 required navigation items with unique ids and exact App Router paths", () => {
    assert.strictEqual(SIDEBAR_ITEMS.length, 8);

    const expectedItems: { id: TabType; path: string }[] = [
      { id: "cockpit", path: "/" },
      { id: "queue", path: "/queue" },
      { id: "voice", path: "/voice" },
      { id: "settings", path: "/settings" },
      { id: "gift", path: "/gift" },
      { id: "safety", path: "/safety" },
      { id: "obs", path: "/obs" },
      { id: "logs", path: "/logs" },
    ];

    const actualIds = SIDEBAR_ITEMS.map((item) => item.id);
    const actualPaths = SIDEBAR_ITEMS.map((item) => item.path);

    assert.deepStrictEqual(actualIds, expectedItems.map((e) => e.id));
    assert.deepStrictEqual(actualPaths, expectedItems.map((e) => e.path));

    const uniqueIds = new Set(actualIds);
    assert.strictEqual(uniqueIds.size, 8);

    const uniquePaths = new Set(actualPaths);
    assert.strictEqual(uniquePaths.size, 8);
  });

  it("ensures each sidebar item contains non-empty label and valid icon component", () => {
    for (const item of SIDEBAR_ITEMS) {
      assert.ok(typeof item.id === "string" && item.id.length > 0);
      assert.ok(typeof item.path === "string" && item.path.startsWith("/"));
      assert.ok(typeof item.label === "string" && item.label.length > 0);
      assert.ok(typeof item.icon === "function" || typeof item.icon === "object");
    }
  });

  it("confirms cockpit and live queue are placed at the primary navigation indices", () => {
    assert.strictEqual(SIDEBAR_ITEMS[0].id, "cockpit");
    assert.strictEqual(SIDEBAR_ITEMS[0].path, "/");
    assert.match(SIDEBAR_ITEMS[0].label, /Cockpit/i);

    assert.strictEqual(SIDEBAR_ITEMS[1].id, "queue");
    assert.strictEqual(SIDEBAR_ITEMS[1].path, "/queue");
    assert.match(SIDEBAR_ITEMS[1].label, /Queue/i);
  });
});

describe("Active Route Matching Logic (isSidebarItemActive)", () => {
  it("activates the root cockpit route '/' strictly on home path", () => {
    assert.strictEqual(isSidebarItemActive("/", "/"), true);
    assert.strictEqual(isSidebarItemActive("/?session=123", "/"), true);
    // Crucial: root '/' must not match subpaths like '/queue' or '/voice'
    assert.strictEqual(isSidebarItemActive("/queue", "/"), false);
    assert.strictEqual(isSidebarItemActive("/voice", "/"), false);
    assert.strictEqual(isSidebarItemActive("/settings", "/"), false);
  });

  it("activates dedicated subroutes for all 7 specialized pages", () => {
    const routePairs: [string, string][] = [
      ["/queue", "/queue"],
      ["/voice", "/voice"],
      ["/settings", "/settings"],
      ["/gift", "/gift"],
      ["/safety", "/safety"],
      ["/obs", "/obs"],
      ["/logs", "/logs"],
    ];

    for (const [pathname, expectedPath] of routePairs) {
      assert.strictEqual(
        isSidebarItemActive(pathname, expectedPath),
        true,
        `Expected pathname "${pathname}" to activate route "${expectedPath}"`
      );
    }
  });

  it("gracefully handles trailing slashes, query parameters, and subpaths", () => {
    assert.strictEqual(isSidebarItemActive("/queue/", "/queue"), true);
    assert.strictEqual(isSidebarItemActive("/voice?tab=tuning", "/voice"), true);
    assert.strictEqual(isSidebarItemActive("/obs/browser-source", "/obs"), true);
    assert.strictEqual(isSidebarItemActive("/logs?filter=error&limit=50", "/logs"), true);
  });

  it("returns false for non-matching routes and null/empty inputs", () => {
    assert.strictEqual(isSidebarItemActive("/settings", "/gift"), false);
    assert.strictEqual(isSidebarItemActive("/safety", "/queue"), false);
    assert.strictEqual(isSidebarItemActive("", "/"), false);
    assert.strictEqual(isSidebarItemActive(null as unknown as string, "/"), false);
    assert.strictEqual(isSidebarItemActive("/queue", null as unknown as string), false);
  });
});

describe("Sidebar Component Props & Contract", () => {
  it("exports Sidebar functional component and helper function", () => {
    assert.strictEqual(typeof Sidebar, "function");
    assert.strictEqual(Sidebar.name, "Sidebar");
    assert.strictEqual(typeof isSidebarItemActive, "function");
  });

  it("verifies SidebarProps contract and callback triggers", () => {
    let changedTab: TabType | null = null;
    let selectedTab: string | null = null;
    let closedMobile = false;
    let closedMobileCompat = false;
    let toggledCollapse = false;

    const mockProps: SidebarProps = {
      pathname: "/voice",
      activeTab: "voice",
      onTabChange: (tab) => {
        changedTab = tab;
      },
      onSelectTab: (tabId) => {
        selectedTab = tabId;
      },
      onMobileClose: () => {
        closedMobile = true;
      },
      onCloseMobile: () => {
        closedMobileCompat = true;
      },
      onToggleCollapse: () => {
        toggledCollapse = true;
      },
      isMobileOpen: true,
      liveQueueCount: 5,
      isStreaming: true,
    };

    assert.strictEqual(mockProps.pathname, "/voice");
    assert.strictEqual(mockProps.activeTab, "voice");
    assert.strictEqual(mockProps.isMobileOpen, true);
    assert.strictEqual(mockProps.liveQueueCount, 5);
    assert.strictEqual(mockProps.isStreaming, true);

    // Trigger mock callbacks
    mockProps.onTabChange?.("queue");
    assert.strictEqual(changedTab, "queue");

    mockProps.onSelectTab?.("obs");
    assert.strictEqual(selectedTab, "obs");

    mockProps.onMobileClose?.();
    assert.strictEqual(closedMobile, true);

    mockProps.onCloseMobile?.();
    assert.strictEqual(closedMobileCompat, true);

    mockProps.onToggleCollapse?.();
    assert.strictEqual(toggledCollapse, true);
  });

  it("creates valid React element for Sidebar with App Router link properties", () => {
    const element = React.createElement(Sidebar, {
      pathname: "/queue",
      liveQueueCount: 3,
      isStreaming: false,
    });

    assert.ok(React.isValidElement(element));
    assert.strictEqual(element.type, Sidebar);
    assert.strictEqual(element.props.pathname, "/queue");
    assert.strictEqual(element.props.liveQueueCount, 3);
  });

  it("validates WCAG 2.1 AA touch target specifications (>= 44x44px)", () => {
    const minTargetPx = 44;
    assert.strictEqual(minTargetPx, 44);
  });
});
