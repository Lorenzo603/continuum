/**
 * Exports the active workspace data (workspace info, streams, cards)
 * as a formatted JSON file download.
 */
export async function exportWorkspaceToJson(workspaceId: string): Promise<void> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/export`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Export failed (${res.status})`);
  }

  const data: unknown = await res.json();

  if (data == null || (typeof data === "object" && Object.keys(data as Record<string, unknown>).length === 0)) {
    throw new Error("Workspace data is empty — nothing to export.");
  }

  let json: string;
  try {
    json = JSON.stringify(data, sanitizeReplacer, 2);
  } catch {
    throw new Error("Failed to serialize workspace data. It may contain unsupported values.");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `workspace-export-${timestamp}.json`;

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * JSON.stringify replacer that strips characters which could break
 * JSON parsers (lone surrogates, control chars other than the
 * standard whitespace ones) and converts unsupported types to null.
 */
function sanitizeReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "string") {
    // Remove lone surrogates and non-standard control characters
    return value.replace(/[\uD800-\uDFFF]|[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  return value;
}
