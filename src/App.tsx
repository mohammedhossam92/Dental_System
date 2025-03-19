import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DarkModeProvider } from './context/DarkModeContext';
import { Navbar } from './components/Navbar';
import { StudentsPage } from './pages/StudentsPage';
import { PatientsPage } from './pages/PatientsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { Dashboard } from './components/Dashboard';
import { CasesPage } from './pages/CasesPage';
import { AttendancePage } from './pages/AttendancePage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <DarkModeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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
        </div>
      </Router>
    </DarkModeProvider>
  );
}
