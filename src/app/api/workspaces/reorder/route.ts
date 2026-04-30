import { NextResponse } from "next/server";
import { reorderWorkspaces } from "@/lib/workspaces";
import { getAuthUserId, unauthorizedJson } from "@/lib/auth";
import { reorderWorkspacesSchema } from "@/lib/validations";

export async function PUT(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return unauthorizedJson();
    }

    const body = await request.json();
    const parsed = reorderWorkspacesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await reorderWorkspaces(parsed.data.orderedIds, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    console.error("Failed to reorder workspaces:", error);
    return NextResponse.json(
      { error: "Failed to reorder workspaces" },
      { status: 500 }
    );
  }
}
