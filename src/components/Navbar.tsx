import React, { useState } from 'react';
import { Users, UserCircle, Settings, FileText, Home, Sun, Moon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';

export function Navbar() {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/patients', icon: UserCircle, label: 'Patients' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <UserCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Dental System</span>
          </Link>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-2"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5 text-gray-200" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="bg-gray-50 dark:bg-gray-700 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 block ${
                  location.pathname === item.path
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              onClick={() => setIsMobileMenuOpen(false)} // Close menu on item click
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={toggleDarkMode}
            className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 block text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {darkMode ? <Sun className="h-5 w-5 text-gray-200" /> : <Moon className="h-5 w-5 text-gray-700" />}
            <span>Toggle Dark Mode</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
