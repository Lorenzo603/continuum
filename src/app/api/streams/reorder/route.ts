import { NextResponse } from "next/server";
import { reorderStreams } from "@/lib/streams";
import { getAuthUserId, unauthorizedJson } from "@/lib/auth";
import { reorderStreamsSchema } from "@/lib/validations";

export async function PUT(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return unauthorizedJson();
    }

    const body = await request.json();
    const parsed = reorderStreamsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await reorderStreams(parsed.data.orderedIds, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    console.error("Failed to reorder streams:", error);
    return NextResponse.json(
      { error: "Failed to reorder streams" },
      { status: 500 }
    );
  }
}
