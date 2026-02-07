export type CursorPayload = {
  sortValue: string | number;
  id: number;
};

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

export function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as CursorPayload;
    if (parsed && typeof parsed.id === "number" && parsed.sortValue !== undefined) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
