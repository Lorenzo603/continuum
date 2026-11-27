import { NextResponse } from "next/server";
import { addCardLink, CardLinkError } from "@/lib/cardLinks";
import { getAuthUserId, unauthorizedJson } from "@/lib/auth";
import { createCardLinkSchema } from "@/lib/validations";

export async function POST(
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
    const parsed = createCardLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const card = await addCardLink(id, parsed.data.targetCardId, userId);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    if (error instanceof CardLinkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to create card link:", error);
    return NextResponse.json(
      { error: "Failed to create card link" },
      { status: 500 }
    );
  }
}
