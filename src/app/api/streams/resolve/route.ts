import { NextResponse } from "next/server";
import { getStreamByTitle } from "@/lib/streams";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title");
    const workspaceId = searchParams.get("workspaceId") ?? undefined;

    if (!title) {
      return NextResponse.json(
        { error: "title query parameter is required" },
        { status: 400 },
      );
    }

    const stream = await getStreamByTitle(title, workspaceId);
    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(stream);
  } catch (error) {
    console.error("Failed to resolve stream by title:", error);
    return NextResponse.json(
      { error: "Failed to resolve stream by title" },
      { status: 500 },
    );
  }
}
