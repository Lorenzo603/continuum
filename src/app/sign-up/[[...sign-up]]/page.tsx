import { SignUp } from "@clerk/nextjs";
import { CLERK_FORCE_REDIRECT_URL, CLERK_SIGN_IN_URL } from "@/lib/clerkUrls";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignUp
        path="/sign-up"
        signInUrl={CLERK_SIGN_IN_URL}
        forceRedirectUrl={CLERK_FORCE_REDIRECT_URL}
      />
    </main>
  );
}
