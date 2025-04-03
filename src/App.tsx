import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DarkModeProvider } from './context/DarkModeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { StudentsPage } from './pages/StudentsPage';
import { PatientsPage } from './pages/PatientsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { Dashboard } from './components/Dashboard';
import { CasesPage } from './pages/CasesPage';
import { AttendancePage } from './pages/AttendancePage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <Navbar />
                    <main className="container mx-auto px-4 py-6">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/students" element={<StudentsPage />} />
                        <Route path="/patients" element={<PatientsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/cases" element={<CasesPage />} />
                        <Route path="/attendance" element={<AttendancePage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                      </Routes>
                    </main>
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </DarkModeProvider>
    </AuthProvider>
  );
}