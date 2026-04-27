export const CLERK_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_CLERK_AUTH !== "false";

export const LEGACY_AUTH_USER_ID = process.env.LEGACY_AUTH_USER_ID?.trim() || "legacy-user";
