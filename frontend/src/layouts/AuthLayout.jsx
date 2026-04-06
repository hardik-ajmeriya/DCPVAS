import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';

export default function AuthLayout({ children }) {
  const { isLoaded, isSignedIn } = useUser();
  const location = useLocation();

  if (!isLoaded) return null;

  // If already signed in, block access to auth pages
  if (isSignedIn) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] text-gray-100 flex items-center justify-center px-4">
      {children}
    </div>
  );
}
