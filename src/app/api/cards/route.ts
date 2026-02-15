import { NextResponse } from "next/server";
import { createCard } from "@/lib/cards";
import { createCardSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const card = await createCard(parsed.data);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Failed to create card:", error);
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 }
    );
  }
}
