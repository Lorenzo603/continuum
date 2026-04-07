import { NextResponse } from "next/server";
import { getCards } from "@/lib/cards";
import { getStreamById } from "@/lib/streams";
import { workspaceIdParamSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (workspaceId) {
      const parsedWorkspaceId = workspaceIdParamSchema.safeParse(workspaceId);
      if (!parsedWorkspaceId.success) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }

      const stream = await getStreamById(id);
      if (!stream || stream.workspaceId !== parsedWorkspaceId.data) {
        return NextResponse.json({ error: "Stream not found" }, { status: 404 });
      }
    }

    const streamCards = await getCards(id);
    return NextResponse.json(streamCards);
  } catch (error) {
    console.error("Failed to fetch cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    );
  }
}
