import { NextResponse } from "next/server";
import {
  getStreamById,
  updateStream,
  deleteStream,
  getSubstreams,
} from "@/lib/streams";
import { getCards } from "@/lib/cards";
import { updateStreamSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stream = await getStreamById(id);

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    const [streamCards, substreams] = await Promise.all([
      getCards(id),
      getSubstreams(id),
    ]);

    return NextResponse.json({ ...stream, cards: streamCards, substreams });
  } catch (error) {
    console.error("Failed to fetch stream:", error);
    return NextResponse.json(
      { error: "Failed to fetch stream" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateStreamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const stream = await updateStream(id, parsed.data);
    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    return NextResponse.json(stream);
  } catch (error) {
    console.error("Failed to update stream:", error);
    return NextResponse.json(
      { error: "Failed to update stream" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteStream(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete stream:", error);
    return NextResponse.json(
      { error: "Failed to delete stream" },
      { status: 500 }
    );
  }
}
