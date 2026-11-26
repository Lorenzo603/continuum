/**
 * Unit tests for src/lib/exportWorkspace.ts (failure paths only).
 * The success path needs DOM APIs (document.createElement), so it is
 * intentionally covered by integration/browser layers instead.
 * fetch is mocked — no network involved.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportWorkspaceToJson } from "@/lib/exportWorkspace";

function mockFetchResponse(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("exportWorkspaceToJson", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws with the server error message when the request fails", async () => {
    vi.stubGlobal("fetch", mockFetchResponse(404, { error: "Workspace not found" }));

    await expect(exportWorkspaceToJson("ws-1")).rejects.toThrow("Workspace not found");
  });

  it("throws a generic message when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("not json")),
      } as Response),
    );

    await expect(exportWorkspaceToJson("ws-1")).rejects.toThrow("Export failed (500)");
  });

  it("throws when the workspace data is empty", async () => {
    vi.stubGlobal("fetch", mockFetchResponse(200, {}));

    await expect(exportWorkspaceToJson("ws-1")).rejects.toThrow(/empty/i);
  });

  it("throws when the workspace data is null", async () => {
    vi.stubGlobal("fetch", mockFetchResponse(200, null));

    await expect(exportWorkspaceToJson("ws-1")).rejects.toThrow(/empty/i);
  });

  it("calls the export endpoint with the workspace id", async () => {
    const fetchMock = mockFetchResponse(404, { error: "nope" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(exportWorkspaceToJson("ws/with slash")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledWith("/api/workspaces/ws%2Fwith%20slash/export");
  });
});
