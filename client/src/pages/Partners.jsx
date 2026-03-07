import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [creating, setCreating] = useState(false);
    const [newKey, setNewKey] = useState(null); // To show the newly generated API key once
    const [visibleKeys, setVisibleKeys] = useState({});

    const toggleVisibility = (id) => {
        setVisibleKeys(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Optional barebones feedback
        const btn = document.activeElement;
        if (btn && btn.textContent === '📋') {
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 2000);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        try {
            const response = await api.get('/partners');
            setPartners(response.data);
        } catch (error) {
            console.error('Failed to fetch partners', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePartner = async (e) => {
        e.preventDefault();
        if (!newPartnerName) return;
        setCreating(true);
        try {
            const response = await api.post('/partners', { name: newPartnerName });
            setPartners([...partners, response.data]);
            setNewKey(response.data.apiKey);
            setNewPartnerName('');
        } catch (error) {
            console.error('Failed to create partner', error);
        } finally {
            setCreating(false);
        }
    };

    const handleTerminate = async (id) => {
        if (!window.confirm('Are you sure you want to terminate this API key? This action will immediately revoke all access.')) return;

        try {
            await api.put(`/partners/${id}/terminate`);
            setPartners(partners.map(p => p.id === id ? { ...p, isActive: false } : p));
        } catch (error) {
            console.error('Failed to terminate partner', error);
        }
    };

    if (loading) return <div className="flex-row gap-2"><div className="spinner"></div> Loading Partners...</div>;

    return (
        <div className="animate-fade-in">
            <div className="flex-row justify-between" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>Partner Integrations</h1>
                    <p>Manage 3rd-party integrators and their API keys.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setShowCreateForm(!showCreateForm); setNewKey(null); }}
                >
                    {showCreateForm ? 'Cancel' : '+ New Partner'}
                </button>
            </div>

            {showCreateForm && (
                <div className="card animate-fade-in glass" style={{ marginBottom: '2rem', borderTop: '2px solid var(--accent-base)' }}>
                    {newKey ? (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <h3 style={{ color: 'var(--accent-base)' }}>Partner Created Successfully!</h3>
                            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                                Please copy this API key now. You will not be able to see it again.
                            </p>
                            <div style={{
                                background: 'rgba(0,0,0,0.5)',
                                padding: '1rem',
                                borderRadius: 'var(--border-radius-sm)',
                                fontFamily: 'monospace',
                                fontSize: '1.25rem',
                                letterSpacing: '2px',
                                border: '1px solid var(--border-subtle)',
                                userSelect: 'all'
                            }}>
                                {newKey}
                            </div>
                            <button
                                className="btn btn-secondary"
                                style={{ marginTop: '2rem' }}
                                onClick={() => { setShowCreateForm(false); setNewKey(null); }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleCreatePartner}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Issue New API Key</h3>
                            <div className="input-group">
                                <label className="input-label">Partner Organization Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={newPartnerName}
                                    onChange={(e) => setNewPartnerName(e.target.value)}
                                    placeholder="e.g. Acme E-Commerce"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? 'Generating...' : 'Generate Key'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-surface)' }}>
                        <tr>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Name</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>API Key (Prefix)</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {partners.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No partners configured.
                                </td>
                            </tr>
                        ) : (
                            partners.map(partner => (
                                <tr key={partner.id} style={{ borderBottom: 'var(--border-subtle)', opacity: partner.isActive ? 1 : 0.6 }} className="hover-row">
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{partner.name}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {/* Show only prefix and obfuscate the rest if not visible */}
                                            {partner.isActive ? (
                                                visibleKeys[partner.id] ? partner.apiKey : `${partner.apiKey.substring(0, 16)}••••••••••••`
                                            ) : '••••••••••••••••••••••••••••'}

                                            {partner.isActive && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button
                                                        onClick={() => toggleVisibility(partner.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}
                                                        title={visibleKeys[partner.id] ? 'Hide' : 'Show'}
                                                    >
                                                        {visibleKeys[partner.id] ? '🙈' : '👁️'}
                                                    </button>
                                                    <button
                                                        onClick={() => copyToClipboard(partner.apiKey)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}
                                                        title="Copy"
                                                    >
                                                        📋
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {partner.isActive ? (
                                            <span className="badge badge-success">Active</span>
                                        ) : (
                                            <span className="badge badge-error">Terminated</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        {partner.isActive && (
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderColor: 'rgba(255, 23, 68, 0.3)', color: '#FF8A80' }}
                                                onClick={() => handleTerminate(partner.id)}
                                            >
                                                Revoke Access
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <style>{`
                    .hover-row:hover {
                        background-color: rgba(255, 255, 255, 0.02);
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Partners;
