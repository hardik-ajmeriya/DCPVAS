import { Route, Routes } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route
        path="/sign-in"
        element={(
          <AuthLayout>
            <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
          </AuthLayout>
        )}
      />

      <Route
        path="/sign-up"
        element={(
          <AuthLayout>
            <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
          </AuthLayout>
        )}
      />

      <Route
        path="/*"
        element={(
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        )}
      />
    </Routes>
  );
}
