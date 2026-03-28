import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

const SVGS = {
    applications: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    applicants: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    partners: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>,
    loanTypes: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    scoreConfig: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><line x1="8" y1="4" x2="8" y2="20"></line><line x1="16" y1="4" x2="16" y2="20"></line><line x1="4" y1="8" x2="8" y2="8"></line><line x1="4" y1="16" x2="8" y2="16"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="16" y1="8" x2="20" y2="8"></line><line x1="16" y1="16" x2="20" y2="16"></line></svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"></path></svg>,
    logs: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
};

const NAV_ITEMS = {
    origination: [
        { to: '/applications', label: 'sidebar.applications', icon: SVGS.applications },
        { to: '/applicants', label: 'sidebar.applicants', icon: SVGS.applicants },
    ],
    system: [
        { to: '/partners', label: 'sidebar.partners', icon: SVGS.partners },
        { to: '/loan-types', label: 'sidebar.loanTypes', icon: SVGS.loanTypes },
        { to: '/score-config', label: 'sidebar.scoreConfig', icon: SVGS.scoreConfig },
        { to: '/settings', label: 'sidebar.dmsIntegration', icon: SVGS.settings },
        { to: '/logs', label: 'sidebar.systemLogs', icon: SVGS.logs },
    ]
};

const NavItem = ({ to, label, icon, locale, t }) => (
    <NavLink
        to={`/${locale}${to}`}
        className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
    >
        <span className="sidebar-icon">{icon}</span>
        {t(label)}
    </NavLink>
);

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate(`/${i18n.language}/login`);
    };

    return (
        <>
            <style>{`
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    padding: 0.625rem 0.875rem;
                    border-radius: var(--border-radius-sm);
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: background 0.15s, color 0.15s;
                    margin-bottom: 2px;
                    border-left: 2px solid transparent;
                }
                .sidebar-link:hover {
                    color: var(--text-primary);
                    background: rgba(255,255,255,0.04);
                }
                .sidebar-link.active {
                    color: var(--accent-base);
                    background: var(--accent-glow);
                    border-left-color: var(--accent-base);
                    font-weight: 600;
                }
                .sidebar-icon {
                    font-size: 0.95rem;
                    width: 20px;
                    text-align: center;
                    flex-shrink: 0;
                }
                .sidebar-section-label {
                    font-size: 0.68rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--text-muted);
                    padding: 0 0.875rem;
                    margin: 1.25rem 0 0.375rem;
                }
                .sidebar-section-label:first-child {
                    margin-top: 0;
                }
            `}</style>

            <aside className="glass" style={{
                width: '260px',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem 1rem',
                zIndex: 10,
                flexShrink: 0,
                borderRight: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: '#fff',
                        fontSize: '1.1rem',
                        flexShrink: 0,
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                    }}>
                        V
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
                        VistOS
                    </h2>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1 }}>
                    <div className="sidebar-section-label">{t('sidebar.origination')}</div>
                    {NAV_ITEMS.origination.map(item => <NavItem key={item.to} locale={i18n.language} t={t} {...item} />)}

                    <div className="sidebar-section-label">{t('sidebar.system')}</div>
                    {NAV_ITEMS.system.map(item => <NavItem key={item.to} locale={i18n.language} t={t} {...item} />)}
                </nav>

                <div style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
                    <LanguageSwitcher />
                </div>

                {/* User / Logout */}
                <div style={{
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    marginTop: 'auto'
                }}>
                    <div style={{ padding: '0 0.5rem', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {user?.firstName} {user?.lastName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {user?.tenantName}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    >
                        {t('sidebar.signOut')}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
