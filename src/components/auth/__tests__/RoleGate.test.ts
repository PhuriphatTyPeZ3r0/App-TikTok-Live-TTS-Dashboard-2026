/**
 * ============================================================================
 * Unit Test Suite for RoleGate Declarative Authorization Component
 * ============================================================================
 *
 * Validates:
 * - Module exports and function signature for RoleGate functional component
 * - Role-Based Access Control (RBAC) declarative authorization rules
 * - Explicit `userRole` override rendering children vs fallback
 * - Hook-derived role resolution when `userRole` is omitted:
 *   - Authenticated Superadministrator (claims 'admin' via Render OAuth)
 *   - Authenticated Streamer (claims 'streamer' via Render OAuth)
 *   - Unauthenticated guest session defaulting to 'streamer'
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

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleGate, type RoleGateProps } from "../RoleGate";

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
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

const mockDoc: any = {
  nodeType: 9,
  nodeName: "#document",
  ownerDocument: null,
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

const mockWindow: any = {
  HTMLIFrameElement: class {},
  Element: class {},
  HTMLElement: class {},
  Document: class {},
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: mockStorage,
  location: {
    search: "",
    href: "http://localhost:3000/",
  },
  history: {
    replaceState: (_data: any, _title: string, url: string) => {
      mockWindow.location.href = url;
      mockWindow.location.search = url.includes("?") ? url.substring(url.indexOf("?")) : "";
    },
  },
  document: mockDoc,
};

mockDoc.defaultView = mockWindow;
(global as any).window = mockWindow;
(global as any).document = mockDoc;
(global as any).localStorage = mockStorage;

// Offline fetch mock preventing external network access during tests
(global as any).fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
});

/**
 * Test renderer harness using React 19 createRoot and act.
 */
function renderRoleGate(element: React.ReactElement) {
  let childMounted = false;
  let fallbackMounted = false;

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

  const root = createRoot(container);
  act(() => {
    root.render(element);
  });

  return {
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

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

describe("RoleGate Declarative Access Control with Explicit userRole", () => {
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

describe("RoleGate Hook-Derived Role Resolution (userRole omitted)", () => {
  beforeEach(() => {
    mockStorage.clear();
    mockWindow.location.search = "";
    mockWindow.location.href = "http://localhost:3000/";
  });

  it("renders protected children when hook resolves 'admin' role matching allowedRoles", () => {
    mockStorage.setItem("streamvox_token", "mock-render-jwt-admin-token");

    let childRendered = false;
    let fallbackRendered = false;

    const { unmount } = renderRoleGate(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin"],
          fallback: React.createElement(() => {
            fallbackRendered = true;
            return null;
          }),
        },
        React.createElement(() => {
          childRendered = true;
          return null;
        })
      )
    );

    assert.strictEqual(childRendered, true, "Protected child should render for hook admin role");
    assert.strictEqual(fallbackRendered, false, "Fallback should not render for hook admin role");

    unmount();
  });

  it("renders fallback when hook resolves 'admin' role not matching allowedRoles", () => {
    mockStorage.setItem("streamvox_token", "mock-render-jwt-admin-token");

    let childRendered = false;
    let fallbackRendered = false;

    const { unmount } = renderRoleGate(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["viewer"],
          fallback: React.createElement(() => {
            fallbackRendered = true;
            return null;
          }),
        },
        React.createElement(() => {
          childRendered = true;
          return null;
        })
      )
    );

    assert.strictEqual(childRendered, false, "Protected child should not render when role not allowed");
    assert.strictEqual(fallbackRendered, true, "Fallback should render when role not allowed");

    unmount();
  });

  it("renders protected children when hook resolves 'streamer' role matching allowedRoles", () => {
    mockStorage.setItem("streamvox_token", "mock-render-jwt-streamer-token");

    let childRendered = false;
    let fallbackRendered = false;

    const { unmount } = renderRoleGate(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["streamer"],
          fallback: React.createElement(() => {
            fallbackRendered = true;
            return null;
          }),
        },
        React.createElement(() => {
          childRendered = true;
          return null;
        })
      )
    );

    assert.strictEqual(childRendered, true, "Protected child should render for hook streamer role");
    assert.strictEqual(fallbackRendered, false, "Fallback should not render for hook streamer role");

    unmount();
  });

  it("renders fallback when hook resolves 'streamer' role not matching allowedRoles", () => {
    mockStorage.setItem("streamvox_token", "mock-render-jwt-streamer-token");

    let childRendered = false;
    let fallbackRendered = false;

    const { unmount } = renderRoleGate(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin"],
          fallback: React.createElement(() => {
            fallbackRendered = true;
            return null;
          }),
        },
        React.createElement(() => {
          childRendered = true;
          return null;
        })
      )
    );

    assert.strictEqual(childRendered, false, "Protected child should not render when admin is required");
    assert.strictEqual(fallbackRendered, true, "Fallback should render when streamer attempts admin gate");

    unmount();
  });

  it("defaults unauthenticated session without token to 'streamer' permitting streamer gate", () => {
    // No token stored -> resolves effectiveRole = 'streamer'
    let childRendered = false;
    let fallbackRendered = false;

    const { unmount } = renderRoleGate(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["streamer"],
          fallback: React.createElement(() => {
            fallbackRendered = true;
            return null;
          }),
        },
        React.createElement(() => {
          childRendered = true;
          return null;
        })
      )
    );

    assert.strictEqual(childRendered, true, "Default streamer fallback should satisfy streamer gate");
    assert.strictEqual(fallbackRendered, false, "Fallback should not render for default streamer");

    unmount();
  });

  it("blocks unauthenticated session without token from accessing admin-only gate", () => {
    // No token stored -> effectiveRole defaults to 'streamer', blocking admin gate
    let childRendered = false;
    let fallbackRendered = false;

    const { unmount } = renderRoleGate(
      React.createElement(
        RoleGate,
        {
          allowedRoles: ["admin"],
          fallback: React.createElement(() => {
            fallbackRendered = true;
            return null;
          }),
        },
        React.createElement(() => {
          childRendered = true;
          return null;
        })
      )
    );

    assert.strictEqual(childRendered, false, "Unauthenticated session must not pass admin gate");
    assert.strictEqual(fallbackRendered, true, "Fallback must render for unauthenticated session");

    unmount();
  });
});
