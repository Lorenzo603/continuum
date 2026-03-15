import { NextResponse } from "next/server";
import { getWorkspaceById } from "@/lib/workspaces";
import { getAllStreams } from "@/lib/streams";
import { getCards } from "@/lib/cards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await getWorkspaceById(id);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const streams = await getAllStreams(id);

    const streamsWithCards = await Promise.all(
      streams.map(async (stream) => {
        const cards = await getCards(stream.id);
        return { ...stream, cards };
      })
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      workspace,
      streams: streamsWithCards,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Failed to export workspace:", error);
    return NextResponse.json(
      { error: "Failed to export workspace" },
      { status: 500 }
    );
  }
}
