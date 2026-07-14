import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserCircle } from 'lucide-react';

export function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password || !name || !inviteCode) {
      setError(t('fillAllFields'));
      return;
    }

    setLoading(true);

    try {
      await signUp({ email, password, name, inviteCode });
      navigate('/');
    } catch (error: any) {
      setError(error.message || t('signUpError'));
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-md border dark:border-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold text-sm transition-colors duration-200"
        >
          {t('toggleLanguage')}
        </button>
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <UserCircle className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('createAccount')}
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center">
              {error}
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">{t('fullName')}</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={t('fullName')}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">{t('emailAddress')}</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={t('emailAddress')}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">{t('password')}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={t('password')}
              />
            </div>
            <div>
              <label htmlFor="invite-code" className="sr-only">{t('inviteCode')}</label>
              <input
                id="invite-code"
                name="invite-code"
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={t('inviteCode')}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? t('creatingAccount') : t('signUp')}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('alreadyHaveAccount')}{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('signIn')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}