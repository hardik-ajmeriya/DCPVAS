import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="w-full max-w-md bg-[var(--bg-secondary,#020617)] border border-[var(--border-color,#1f2937)] rounded-2xl shadow-xl p-6 sm:p-8">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
        afterSignUpUrl="/"
      />
    </div>
  );
}
