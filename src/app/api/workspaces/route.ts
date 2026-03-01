import { NextResponse } from "next/server";
import { getAllWorkspaces, createWorkspace } from "@/lib/workspaces";
import { createWorkspaceSchema } from "@/lib/validations";

export async function GET() {
  try {
    const workspaces = await getAllWorkspaces();
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workspace = await createWorkspace(parsed.data);
    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Failed to create workspace:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
