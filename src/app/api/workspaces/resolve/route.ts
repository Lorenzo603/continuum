import { NextResponse } from "next/server";
import { getWorkspaceByName } from "@/lib/workspaces";
import { getAuthUserId, unauthorizedJson } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return unauthorizedJson();
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "name query parameter is required" },
        { status: 400 },
      );
    }

    const workspace = await getWorkspaceByName(name, userId);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to resolve workspace by name:", error);
    return NextResponse.json(
      { error: "Failed to resolve workspace by name" },
      { status: 500 },
    );
  }
}
