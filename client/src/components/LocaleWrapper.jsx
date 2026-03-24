import React, { useEffect } from 'react';
import { useParams, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LOCALES = ['en', 'hy'];
const DEFAULT_LOCALE = 'hy';

const LocaleWrapper = () => {
    const { locale } = useParams();
    const { i18n } = useTranslation();
    const location = useLocation();

    useEffect(() => {
        if (SUPPORTED_LOCALES.includes(locale) && i18n.language !== locale) {
            i18n.changeLanguage(locale);
        }

        // Update hreflang tags
        const updateHrefLang = () => {
            const baseUrl = window.location.origin;
            const currentPath = location.pathname;
            
            // Remove current locale from path to get the route suffix
            const pathWithoutLocale = currentPath.replace(new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})`), '');
            
            SUPPORTED_LOCALES.forEach(l => {
                let link = document.querySelector(`link[hreflang="${l}"]`);
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'alternate';
                    link.hreflang = l;
                    document.head.appendChild(link);
                }
                const newPath = `/${l}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
                link.href = `${baseUrl}${newPath}`;
            });

            // x-default should point to the default locale
            let xDefault = document.querySelector('link[hreflang="x-default"]');
            if (!xDefault) {
                xDefault = document.createElement('link');
                xDefault.rel = 'alternate';
                xDefault.hreflang = 'x-default';
                document.head.appendChild(xDefault);
            }
            const defaultPath = `/${DEFAULT_LOCALE}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
            xDefault.href = `${baseUrl}${defaultPath}`;
        };

        updateHrefLang();
    }, [locale, i18n, location.pathname]);

    if (!SUPPORTED_LOCALES.includes(locale)) {
        // Redirect invalid locales (e.g., /fr/login) to the default locale
        const currentPath = location.pathname;
        const newPath = currentPath.replace(/^\/[^/]+/, `/${DEFAULT_LOCALE}`);
        return <Navigate to={newPath} replace />;
    }

    return <Outlet />;
};

export default LocaleWrapper;
