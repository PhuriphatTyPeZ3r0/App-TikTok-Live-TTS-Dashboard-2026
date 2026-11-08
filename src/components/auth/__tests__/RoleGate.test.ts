/**
 * ============================================================================
 * Unit Test Suite for RoleGate Declarative Authorization Component
 * ============================================================================
 *
 * Validates:
 * - Module exports and function signature for RoleGate functional component
 * - Role-Based Access Control (RBAC) declarative authorization rules
 * - Rendering children User Interface (UI) tree when allowed role matches
 * - Rendering fallback User Interface (UI) element when allowed role does not match
 * - Rendering loadingFallback placeholder during initial authentication revalidation
 * - Graceful default null fallback when no explicit fallback element is supplied
 * - Support for multi-tier authorization arrays (e.g. ['admin', 'streamer'])
 *
 * Dedicated to Master Thai Voice Actor:
 * คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Single Sign-On (SSO)
 * - Open Authorization (OAuth)
 * - JSON Web Token (JWT)
 * - Application Programming Interface (API)
 * - User Interface (UI)
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleGate, type RoleGateProps } from "../RoleGate";

describe("RoleGate Component Contract & Exports", () => {
  it("exports RoleGate functional component successfully", () => {
    assert.strictEqual(typeof RoleGate, "function");
    assert.strictEqual(RoleGate.name, "RoleGate");
  });

  it("verifies RoleGateProps type contract and element properties", () => {
    const mockProps: RoleGateProps = {
      allowedRoles: ["admin"],
      children: React.createElement("div", null, "Authorized Content"),
      fallback: React.createElement("div", null, "Access Denied"),
      userRole: "admin",
      loadingFallback: React.createElement("div", null, "Loading..."),
    };

    assert.ok(Array.isArray(mockProps.allowedRoles));
    assert.strictEqual(mockProps.allowedRoles[0], "admin");
    assert.strictEqual(mockProps.userRole, "admin");
    assert.ok(React.isValidElement(mockProps.children));
    assert.ok(React.isValidElement(mockProps.fallback));
    assert.ok(React.isValidElement(mockProps.loadingFallback));
  });
});

describe("RoleGate Declarative Access Control Authorization", () => {
  it("renders protected children when allowed role matches userRole", () => {
    const output = renderToStaticMarkup(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin"],
          userRole: "admin",
          fallback: React.createElement("div", { id: "fallback" }, "Access Denied"),
        },
        React.createElement("div", { id: "protected" }, "Superadmin Panel")
      )
    );

    assert.ok(output.includes("Superadmin Panel"));
    assert.ok(!output.includes("Access Denied"));
  });

  it("renders fallback when allowed role does not match userRole", () => {
    const output = renderToStaticMarkup(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin"],
          userRole: "viewer",
          fallback: React.createElement("div", { id: "fallback" }, "Access Denied"),
        },
        React.createElement("div", { id: "protected" }, "Superadmin Panel")
      )
    );

    assert.ok(output.includes("Access Denied"));
    assert.ok(!output.includes("Superadmin Panel"));
  });

  it("renders children when user role matches one of multiple permitted roles", () => {
    const output = renderToStaticMarkup(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin", "streamer"],
          userRole: "streamer",
          fallback: React.createElement("div", { id: "fallback" }, "Forbidden"),
        },
        React.createElement("div", { id: "broadcaster" }, "Live Queue Operations")
      )
    );

    assert.ok(output.includes("Live Queue Operations"));
    assert.ok(!output.includes("Forbidden"));
  });

  it("renders fallback when user role is not included in multi-role whitelist", () => {
    const output = renderToStaticMarkup(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin", "streamer"],
          userRole: "viewer",
          fallback: React.createElement("div", { id: "fallback" }, "Upgrade Required"),
        },
        React.createElement("div", { id: "broadcaster" }, "Live Queue Operations")
      )
    );

    assert.ok(output.includes("Upgrade Required"));
    assert.ok(!output.includes("Live Queue Operations"));
  });

  it("renders empty output when access is denied and no fallback is specified", () => {
    const output = renderToStaticMarkup(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin"],
          userRole: "viewer",
        },
        React.createElement("div", { id: "hidden" }, "Hidden Administrative Secret")
      )
    );

    assert.strictEqual(output, "");
  });

  it("renders loadingFallback placeholder during initial unauthenticated revalidation", () => {
    // When no userRole override is passed, initial hook state is loading
    const output = renderToStaticMarkup(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin"],
          loadingFallback: React.createElement("div", { id: "loading" }, "Verifying Credentials..."),
          fallback: React.createElement("div", { id: "fallback" }, "Access Denied"),
        },
        React.createElement("div", { id: "protected" }, "Superadmin Panel")
      )
    );

    assert.ok(output.includes("Verifying Credentials..."));
    assert.ok(!output.includes("Superadmin Panel"));
    assert.ok(!output.includes("Access Denied"));
  });
});
