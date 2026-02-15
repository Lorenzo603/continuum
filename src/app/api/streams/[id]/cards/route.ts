import { NextResponse } from "next/server";
import { getCards } from "@/lib/cards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
