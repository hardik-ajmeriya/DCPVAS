import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md bg-[var(--bg-secondary,#020617)] border border-[var(--border-color,#1f2937)] rounded-2xl shadow-xl p-6 sm:p-8">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
}
