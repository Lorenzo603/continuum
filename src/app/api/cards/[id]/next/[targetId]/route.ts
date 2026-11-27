import { NextResponse } from "next/server";
import { removeCardLink, CardLinkError } from "@/lib/cardLinks";
import { getAuthUserId, unauthorizedJson } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; targetId: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return unauthorizedJson();
    }

    const { id, targetId } = await params;
    const card = await removeCardLink(id, targetId, userId);
    return NextResponse.json(card);
  } catch (error) {
    if (error instanceof CardLinkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to remove card link:", error);
    return NextResponse.json(
      { error: "Failed to remove card link" },
      { status: 500 }
    );
  }
}
