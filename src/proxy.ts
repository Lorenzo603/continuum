import { NextResponse, type NextRequest } from "next/server";

function getProvidedToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const accessTokenHeader = request.headers.get("X-Access-Token");

  return bearerToken ?? accessTokenHeader;
}

export function proxy(request: NextRequest) {
  const requiredToken = process.env.ACCESS_TOKEN;

  if (!requiredToken) {
    return NextResponse.next();
  }

  const providedToken = getProvidedToken(request);

  if (!providedToken || providedToken !== requiredToken) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Valid access token required." },
        { status: 401 },
      );
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div>error</div>
        </body>
      </html>`,
      {
        status: 401,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};