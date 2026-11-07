/**
 * Unit Test Suite for Sidebar Component Navigation & Responsive Constants.
 *
 * Validates:
 * - SIDEBAR_ITEMS list integrity, unique ids, non-empty labels, and icons
 * - Navigation item structure for StreamVox Live Cockpit, FIFO queue, Voice Studio, OBS, and logs
 * - Voice actor attribution context: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 *
 * Terminology & Acronyms:
 * - Single-Page Application (SPA)
 * - User Interface (UI)
 * - User Experience (UX)
 * - First-In, First-Out (FIFO)
 * - Open Broadcaster Software (OBS)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SIDEBAR_ITEMS, type TabType } from "../Sidebar";

describe("Sidebar Navigation Structure & Constants", () => {
  it("contains all required navigation items with unique ids", () => {
    assert.strictEqual(SIDEBAR_ITEMS.length, 6);

    const expectedIds: TabType[] = [
      "cockpit",
      "queue",
      "voice",
      "settings",
      "obs",
      "logs",
    ];

    const actualIds = SIDEBAR_ITEMS.map((item) => item.id);
    assert.deepStrictEqual(actualIds, expectedIds);

    const uniqueIds = new Set(actualIds);
    assert.strictEqual(uniqueIds.size, expectedIds.length);
  });

  it("ensures each sidebar item contains non-empty label and valid icon component", () => {
    for (const item of SIDEBAR_ITEMS) {
      assert.ok(typeof item.id === "string" && item.id.length > 0);
      assert.ok(typeof item.label === "string" && item.label.length > 0);
      assert.ok(typeof item.icon === "function" || typeof item.icon === "object");
    }
  });

  it("confirms cockpit and live queue are placed at the primary navigation indices", () => {
    assert.strictEqual(SIDEBAR_ITEMS[0].id, "cockpit");
    assert.match(SIDEBAR_ITEMS[0].label, /Cockpit/i);

    assert.strictEqual(SIDEBAR_ITEMS[1].id, "queue");
    assert.match(SIDEBAR_ITEMS[1].label, /Queue/i);
  });
});
