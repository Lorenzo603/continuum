import { NextResponse } from "next/server";
import { reorderStreams } from "@/lib/streams";
import { reorderStreamsSchema } from "@/lib/validations";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = reorderStreamsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await reorderStreams(parsed.data.orderedIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder streams:", error);
    return NextResponse.json(
      { error: "Failed to reorder streams" },
      { status: 500 }
    );
  }
}
