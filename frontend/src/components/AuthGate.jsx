import { SignIn, useUser } from '@clerk/react';

export default function AuthGate({ children }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Loading authentication...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <SignIn
          appearance={{ elements: { rootBox: 'shadow-xl rounded-2xl' } }}
          routing="path"
          path="/"
          afterSignInUrl="/"
          afterSignUpUrl="/"
        />
      </div>
    );
  }

  return children;
}
