import { NextResponse } from "next/server";
import { getCardById, updateCard, deleteCard } from "@/lib/cards";
import { updateCardSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = await getCardById(id);

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error("Failed to fetch card:", error);
    return NextResponse.json(
      { error: "Failed to fetch card" },
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
    const parsed = updateCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const card = await updateCard(id, parsed.data);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update card";
    const status = message.includes("not found")
      ? 404
      : message.includes("Only the latest")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteCard(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete card";
    const status = message.includes("not found")
      ? 404
      : message.includes("Only the latest")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
