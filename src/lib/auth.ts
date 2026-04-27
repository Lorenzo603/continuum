import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { CLERK_AUTH_ENABLED, LEGACY_AUTH_USER_ID } from "@/lib/authMode";

export async function getAuthUserId(): Promise<string | null> {
  if (!CLERK_AUTH_ENABLED) {
    return LEGACY_AUTH_USER_ID;
  }

  const { userId } = await auth();
  return userId;
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
