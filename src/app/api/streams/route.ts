import { NextResponse } from "next/server";
import { getStreamTree, createStream } from "@/lib/streams";
import { createStreamSchema } from "@/lib/validations";

export async function GET() {
  try {
    const tree = await getStreamTree();
    return NextResponse.json(tree);
  } catch (error) {
    console.error("Failed to fetch streams:", error);
    return NextResponse.json(
      { error: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createStreamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const stream = await createStream(parsed.data);
    return NextResponse.json(stream, { status: 201 });
  } catch (error) {
    console.error("Failed to create stream:", error);
    return NextResponse.json(
      { error: "Failed to create stream" },
      { status: 500 }
    );
  }
}
