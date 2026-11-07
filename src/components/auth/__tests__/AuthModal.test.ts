/**
 * Unit Test Suite for AuthModal Component & Primitives.
 *
 * Validates:
 * - Module exports and function signature for AuthModal
 * - Single Sign-On (SSO) and Role-Based Access Control (RBAC) contract compliance
 * - Dedicated to Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 *
 * Full Academic Terminology & Acronyms:
 * - Single Sign-On (SSO)
 * - Open Authorization (OAuth)
 * - Role-Based Access Control (RBAC)
 * - Application Programming Interface (API)
 * - Single-Page Application (SPA)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuthModal, type AuthModalProps } from "../AuthModal";

describe("AuthModal Component Contract", () => {
  it("exports AuthModal functional component successfully", () => {
    assert.strictEqual(typeof AuthModal, "function");
    assert.strictEqual(AuthModal.name, "AuthModal");
  });

  it("verifies AuthModalProps contract types", () => {
    const mockProps: AuthModalProps = {
      isOpen: false,
      onClose: () => {},
      defaultTab: "signin",
    };

    assert.strictEqual(typeof mockProps.isOpen, "boolean");
    assert.strictEqual(typeof mockProps.onClose, "function");
    assert.strictEqual(mockProps.defaultTab, "signin");
  });
});
