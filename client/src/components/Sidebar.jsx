import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const NAV_ITEMS = {
    origination: [
        { to: '/applications', label: 'Applications', icon: '📋' },
        { to: '/applicants', label: 'Applicants', icon: '👤' },
    ],
    system: [
        { to: '/partners', label: 'Partners', icon: '🤝' },
        { to: '/loan-types', label: 'Loan Types', icon: '⚙️' },
        { to: '/settings', label: 'DMS Integration', icon: '🔌' },
        { to: '/logs', label: 'System Logs', icon: '📜' },
    ]
};

const NavItem = ({ to, label, icon }) => (
    <NavLink
        to={to}
        className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
    >
        <span className="sidebar-icon">{icon}</span>
        {label}
    </NavLink>
);

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
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

            <aside style={{
                width: '240px',
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.25rem 0.75rem',
                zIndex: 10,
                flexShrink: 0
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.5rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'var(--accent-base)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: 'var(--bg-primary)',
                        fontSize: '0.9rem',
                        flexShrink: 0
                    }}>
                        V
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        VistOS
                    </h2>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1 }}>
                    <div className="sidebar-section-label">Origination</div>
                    {NAV_ITEMS.origination.map(item => <NavItem key={item.to} {...item} />)}

                    <div className="sidebar-section-label">System</div>
                    {NAV_ITEMS.system.map(item => <NavItem key={item.to} {...item} />)}
                </nav>

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
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
