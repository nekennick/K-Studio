import React, { useState } from 'react';
import { useTranslation } from '../i18n/context';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';

interface LoginProps {
  onLoginSuccess: () => void;
}

/**
 * Converts a string to its hexadecimal representation, correctly handling Unicode.
 * @param str The string to convert.
 * @returns The UTF-8 hexadecimal string.
 */
const stringToHex = (str: string): string => {
  try {
    // Use encodeURIComponent to handle UTF-8 characters correctly, then convert bytes to hex.
    const utf8Str = unescape(encodeURIComponent(str));
    let hex = '';
    for (let i = 0; i < utf8Str.length; i++) {
      const charCode = utf8Str.charCodeAt(i).toString(16);
      hex += charCode.padStart(2, '0');
    }
    return hex;
  } catch (e) {
    console.error("Failed to convert string to hex", e);
    // Fallback to a simple method that works for ASCII, in case of unexpected errors.
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i).toString(16);
      hex += charCode.padStart(2, '0');
    }
    return hex;
  }
};


// In a real-world application, this should never be stored client-side.
// For this self-contained demo, it's a simple way to simulate a login.
// Passwords have been converted to hex for obfuscation.
const ALLOWED_HEX_PASSWORDS = [
  '636875e1bb91695f6368c3ad6e', // chuối_chín
  '7469656d5f6368756f695f6e616e6f5f32303234', // tiem_chuoi_nano_2024
  '61646d696e', // admin
  '64756e67', // dung
  '68756e67', //hung
  '686169',//hai
  '6869656e',//hien
  '686f616e677675', //hoangvu
  '746F616E',//toan
  '7068616D6475',
  '74616D',
  '6D616E68746169',
  '62696269',
  '7461796C65',
  '686f616e6764696570' // hoangdiep
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredPasswordHex = stringToHex(password);
    
    // Case-insensitive check: convert stored hex to lowercase for comparison.
    // This allows passwords in ALLOWED_HEX_PASSWORDS to be stored in either case.
    const isAuthenticated = ALLOWED_HEX_PASSWORDS.some(
      allowedHex => allowedHex.toLowerCase() === enteredPasswordHex
    );

    if (isAuthenticated) {
      setError(null);
      onLoginSuccess();
    } else {
      setError(t('login.error'));
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-sm mx-auto animate-fade-in">
        {/* Login Form */}
        <form 
          onSubmit={handleSubmit} 
          className="bg-[var(--bg-card-alpha)] backdrop-blur-lg rounded-xl border border-[var(--border-primary)] shadow-2xl shadow-black/20 p-8 pt-6"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] mb-2">
              {t('app.title')}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">{t('login.subtitle')}</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="password-input" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('login.passwordLabel')}
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="my-4 p-3 bg-[var(--bg-error)] border border-[var(--border-error)] text-[var(--text-error)] rounded-lg text-center text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!password}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--text-on-accent)] font-semibold rounded-lg shadow-lg shadow-[var(--accent-shadow)] hover:from-[var(--accent-primary-hover)] hover:to-[var(--accent-secondary-hover)] disabled:bg-[var(--bg-disabled)] disabled:from-[var(--bg-disabled)] disabled:to-[var(--bg-disabled)] disabled:text-[var(--text-disabled)] disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
          >
            {t('login.button')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;