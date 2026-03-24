import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { locale } = useParams();

    const switchLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'hy' : 'en';
        
        let currentPath = location.pathname;
        const newPath = currentPath.replace(new RegExp(`^/${i18n.language}`), `/${nextLang}`);
        
        navigate({
            pathname: newPath,
            search: location.search,
            hash: location.hash
        }, { replace: true });
    };

    return (
        <button 
            onClick={switchLanguage}
            style={{
                background: 'transparent',
                border: '1px solid var(--border-neutral)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
            }}
            title={i18n.language === 'en' ? 'Switch to Armenian' : 'Switch to English'}
        >
            {i18n.language === 'en' ? '🇦🇲 Հայ' : '🇬🇧 EN'}
        </button>
    );
};

export default LanguageSwitcher;
