import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SpiritProvider, useSpirit } from './contexts/SpiritContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import CommitmentsPage from './pages/CommitmentsPage';
import AuthCallback from './pages/AuthCallback';
import WelcomePage from './pages/WelcomePage';
import GoogleOAuthCallback from './pages/GoogleOAuthCallback';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import LoadingScreen from './components/LoadingScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function SpiritRoute({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  const { spirit, loading } = useSpirit();

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!spirit) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!spirit.name && spirit.status !== 'revoked') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { spirit, loading: spiritLoading } = useSpirit();

  if (loading || spiritLoading) {
    return <LoadingScreen />;
  }

  if (user) {
    if (!spirit || (!spirit.name && spirit.status !== 'revoked')) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to={`/chat/${spirit.id}`} replace />;
  }

  return <>{children}</>;
}

function ChatIndex() {
  const { spirit, loading } = useSpirit();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!spirit) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to={`/chat/${spirit.id}`} replace />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/oauth/google/callback" element={<GoogleOAuthCallback />} />
      <Route path="/auth/welcome" element={<WelcomePage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:spiritId"
        element={
          <ProtectedRoute>
            <SpiritRoute>
              <ChatPage />
            </SpiritRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/chat" element={<ChatIndex />} />
      <Route
        path="/commitments"
        element={
          <ProtectedRoute>
            <CommitmentsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<ChatIndex />} />
      <Route path="*" element={<ChatIndex />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SpiritProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
            <AppContent />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 2000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </SpiritProvider>
    </AuthProvider>
  );
}

export default App;
