import { SignIn } from "@clerk/nextjs";
import { CLERK_FORCE_REDIRECT_URL, CLERK_SIGN_UP_URL } from "@/lib/clerkUrls";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignIn
        path="/sign-in"
        signUpUrl={CLERK_SIGN_UP_URL}
        forceRedirectUrl={CLERK_FORCE_REDIRECT_URL}
      />
    </main>
  );
}
