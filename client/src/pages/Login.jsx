import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('admin@vist.am');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    const from = location.state?.from?.pathname || `/${i18n.language}/applications`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || t('login.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, rgba(0, 230, 118, 0.08), var(--bg-primary) 60%)'
        }}>
            <div className="card animate-fade-in glass" style={{ maxWidth: '400px', width: '100%', borderTop: '2px solid var(--accent-base)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: 'var(--accent-base)', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--bg-primary)',
                        marginBottom: '1rem',
                        boxShadow: '0 0 20px rgba(0, 230, 118, 0.4)'
                    }}>
                        V
                    </div>
                    <h2>{t('login.welcome')}</h2>
                    <p style={{ marginTop: '0.25rem' }}>{t('login.subtitle')}</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(255, 23, 68, 0.1)', color: '#FF8A80', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid rgba(255, 23, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="email">{t('login.email')}</label>
                        <input
                            type="email"
                            id="email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="password">{t('login.password')}</label>
                        <input
                            type="password"
                            id="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? <div className="spinner"></div> : t('login.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
