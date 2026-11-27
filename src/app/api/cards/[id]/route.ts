import { NextResponse } from "next/server";
import { getCardById, updateCard, deleteCard } from "@/lib/cards";
import { CardLinkError } from "@/lib/cardLinks";
import { getAuthUserId, unauthorizedJson } from "@/lib/auth";
import { updateCardSchema } from "@/lib/validations";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof CardLinkError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("not found") ? 404 : message.includes("has next links") ? 409 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return unauthorizedJson();
    }

    const { id } = await params;
    const card = await getCardById(id, userId);

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
    const userId = await getAuthUserId();
    if (!userId) {
      return unauthorizedJson();
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCardSchema.safeParse(body);

    if (!parsed.success) {
      console.error("PATCH /api/cards validation failed:", JSON.stringify(parsed.error.flatten()), "body:", JSON.stringify(body));
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const card = await updateCard(id, userId, parsed.data);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to update card");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return unauthorizedJson();
    }

    const { id } = await params;
    await deleteCard(id, userId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete card");
  }
}
