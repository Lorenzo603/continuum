import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { CLERK_AUTH_ENABLED } from "@/lib/authMode";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

function getProvidedToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const accessTokenHeader = request.headers.get("X-Access-Token");

  return bearerToken ?? accessTokenHeader;
}

function legacyTokenProxy(request: NextRequest) {
  const disabled = process.env.ACCESS_TOKEN_CHECK_DISABLED === "true";
  if (disabled) {
    return NextResponse.next();
  }

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

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (!CLERK_AUTH_ENABLED) {
    return legacyTokenProxy(request);
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};