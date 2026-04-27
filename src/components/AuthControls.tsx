"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { CLERK_AUTH_ENABLED } from "@/lib/authMode";

interface AuthControlsProps {
  className?: string;
}

export function AuthControls({ className }: AuthControlsProps) {
  if (!CLERK_AUTH_ENABLED) {
    return null;
  }

  return <ClerkAuthControls className={className} />;
}

function ClerkAuthControls({ className }: AuthControlsProps) {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className={className}>
      {isLoaded && isSignedIn ? (
        <UserButton />
      ) : isLoaded ? (
        <div className="flex items-center gap-2">
          <SignInButton mode="redirect" forceRedirectUrl="/">
            <button className="rounded-md border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="redirect" forceRedirectUrl="/">
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover">
              Sign up
            </button>
          </SignUpButton>
        </div>
      ) : null}
    </div>
  );
}
