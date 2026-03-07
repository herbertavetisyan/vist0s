import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const EyeIcon = ({ open }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

const FieldGroup = ({ label, name, value, onChange, placeholder, hint, isKey }) => {
    const [show, setShow] = useState(false);

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor={name} style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem'
            }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <input
                    id={name}
                    name={name}
                    type={isKey && !show ? 'password' : 'text'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        padding: isKey ? '0.75rem 3rem 0.75rem 1rem' : '0.75rem 1rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--border-radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontFamily: isKey ? 'monospace' : 'inherit',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => {
                        e.target.style.borderColor = 'var(--accent-base)';
                        e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
                    }}
                    onBlur={e => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.target.style.boxShadow = 'none';
                    }}
                />
                {isKey && (
                    <button
                        type="button"
                        onClick={() => setShow(s => !s)}
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px'
                        }}
                    >
                        <EyeIcon open={show} />
                    </button>
                )}
            </div>
            {hint && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                    {hint}
                </p>
            )}
        </div>
    );
};

const SectionCard = ({ title, icon, children, accentColor = 'var(--accent-base)' }) => (
    <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--border-radius-md)',
        overflow: 'hidden',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
    }}>
        <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(255,255,255,0.02)'
        }}>
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `${accentColor}20`,
                border: `1px solid ${accentColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
            }}>
                {icon}
            </div>
            <h2 style={{ fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {title}
            </h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
            {children}
        </div>
    </div>
);

const DmsSettings = () => {
    const [settings, setSettings] = useState({
        dmsUrl: '',
        dmsKey: '',
        dmsRecalculateUrl: '',
        dmsRecalculateKey: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            if (res.data) {
                setSettings({
                    dmsUrl: res.data.dmsUrl || '',
                    dmsKey: res.data.dmsKey || '',
                    dmsRecalculateUrl: res.data.dmsRecalculateUrl || '',
                    dmsRecalculateKey: res.data.dmsRecalculateKey || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/settings', settings);
            toast.success('DMS settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: 'var(--text-secondary)' }}>
                <div className="spinner" />
                Loading DMS settings…
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '780px' }}>
            {/* Page Header */}
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    DMS Integration
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.9rem' }}>
                    Configure the Decision Making Software (DMS) endpoints and API keys used for loan scoring.
                </p>
            </header>

            <form onSubmit={handleSave}>
                <SectionCard title="Main Scoring Flow" icon="⚡" accentColor="var(--accent-base)">
                    <FieldGroup
                        label="DMS API URL"
                        name="dmsUrl"
                        value={settings.dmsUrl}
                        onChange={handleChange}
                        placeholder="https://stage.decision-making.software/api/flows/publish/…/v2"
                        hint="The primary endpoint called when a new application is scored through the full pipeline."
                    />
                    <FieldGroup
                        label="DMS API Key"
                        name="dmsKey"
                        value={settings.dmsKey}
                        onChange={handleChange}
                        placeholder="Enter your DMS API key"
                        hint="Authentication token for the main scoring endpoint. Kept encrypted at rest."
                        isKey
                    />
                </SectionCard>

                <SectionCard title="Recalculation Flow" icon="🔄" accentColor="#2962FF">
                    <FieldGroup
                        label="Recalculation API URL"
                        name="dmsRecalculateUrl"
                        value={settings.dmsRecalculateUrl}
                        onChange={handleChange}
                        placeholder="https://stage.decision-making.software/api/flows/publish/…/v2"
                        hint="Endpoint used when recalculating an existing application's monthly payment / rate."
                    />
                    <FieldGroup
                        label="Recalculation API Key"
                        name="dmsRecalculateKey"
                        value={settings.dmsRecalculateKey}
                        onChange={handleChange}
                        placeholder="Enter your recalculation API key"
                        hint="Authentication token specifically for the recalculation endpoint."
                        isKey
                    />
                </SectionCard>

                {/* Info Banner */}
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--border-radius-sm)',
                    background: 'rgba(0,230,118,0.06)',
                    border: '1px solid rgba(0,230,118,0.2)',
                    marginBottom: '1.5rem'
                }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                        Both flows must be configured for the system to function correctly. The <strong style={{ color: 'var(--text-primary)' }}>main flow</strong> handles full scoring with NORQ + ACRA data. The <strong style={{ color: 'var(--text-primary)' }}>recalculation flow</strong> handles quick monthly payment calculations on an existing decision.
                    </p>
                </div>

                {/* Save button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary"
                        style={{ minWidth: '140px' }}
                    >
                        {saving ? (
                            <>
                                <div className="spinner" style={{ width: '14px', height: '14px', borderTopColor: 'var(--bg-primary)' }} />
                                Saving…
                            </>
                        ) : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DmsSettings;
