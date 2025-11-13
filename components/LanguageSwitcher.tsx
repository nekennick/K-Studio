import React from 'react';
import { useTranslation } from '../i18n/context';

const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage } = useTranslation();

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'vi' : 'en';
    changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="py-2 px-3 text-sm font-semibold text-[var(--text-primary)] bg-[rgba(107,114,128,0.2)] rounded-md hover:bg-[rgba(107,114,128,0.4)] transition-colors duration-200"
      aria-label="Switch language"
    >
      {language === 'en' ? 'Tiếng Việt' : 'EN'}
    </button>
  );
};

export default LanguageSwitcher;