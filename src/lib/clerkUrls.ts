const DEFAULT_SIGN_IN_URL = "/sign-in";
const DEFAULT_SIGN_UP_URL = "/sign-up";
const DEFAULT_FORCE_REDIRECT_URL = "/";

function deriveForceRedirectUrl(signInUrl: string): string {
  if (!signInUrl.startsWith("http://") && !signInUrl.startsWith("https://")) {
    return DEFAULT_FORCE_REDIRECT_URL;
  }

  try {
    const parsed = new URL(signInUrl);
    return `${parsed.origin}/`;
  } catch {
    return DEFAULT_FORCE_REDIRECT_URL;
  }
}

export const CLERK_SIGN_IN_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() || DEFAULT_SIGN_IN_URL;

export const CLERK_SIGN_UP_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL?.trim() || DEFAULT_SIGN_UP_URL;

export const CLERK_FORCE_REDIRECT_URL =
  process.env.NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL?.trim() ||
  deriveForceRedirectUrl(CLERK_SIGN_IN_URL);
