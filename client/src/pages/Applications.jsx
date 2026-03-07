import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Applications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Filter state
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [stageFilter, setStageFilter] = useState('ALL');

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const response = await api.get('/applications');
            setApplications(response.data);
        } catch (error) {
            console.error('Failed to fetch applications', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="badge badge-success">Approved</span>;
            case 'PROCESSING': return <span className="badge badge-info">Processing</span>;
            case 'REJECTED': return <span className="badge badge-error">Rejected</span>;
            case 'DISBURSED': return <span className="badge badge-success" style={{ background: 'var(--accent-base)', color: 'var(--bg-primary)' }}>Disbursed</span>;
            default: return <span className="badge badge-neutral">{status}</span>;
        }
    };

    // Derive unique statuses and stages from data
    const uniqueStatuses = useMemo(() => {
        const set = new Set(applications.map(a => a.status));
        return ['ALL', ...Array.from(set)];
    }, [applications]);

    const uniqueStages = useMemo(() => {
        const set = new Set(applications.map(a => a.currentStage));
        return ['ALL', ...Array.from(set)];
    }, [applications]);

    // Filtered + sorted list (already sorted by backend, but filter here)
    const filtered = useMemo(() => {
        return applications.filter(app => {
            // Status filter
            if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
            // Stage filter
            if (stageFilter !== 'ALL' && app.currentStage !== stageFilter) return false;
            // Text search: name, ssn, passport, id, partner name
            if (searchText) {
                const q = searchText.toLowerCase();
                const haystack = [
                    app.id,
                    app.applicant?.firstName,
                    app.applicant?.lastName,
                    app.applicant?.ssn,
                    app.applicant?.passport,
                    app.partner?.name
                ].filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [applications, statusFilter, stageFilter, searchText]);

    const formatDateTime = (isoStr) => {
        const d = new Date(isoStr);
        const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return { date, time };
    };

    if (loading) return <div className="flex-row gap-2"><div className="spinner"></div> Loading Applications...</div>;

    return (
        <div className="animate-fade-in">
            <div className="flex-row justify-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1>Loan Applications</h1>
                    <p>Manage and track all originating loans.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/applications/new')}>
                    + New Application
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{
                display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center',
                padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)'
            }}>
                <div style={{ flex: '1 1 220px' }}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Search name, SSN, passport, ID..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ marginBottom: 0 }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        className="input-field"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ marginBottom: 0, width: 'auto', minWidth: '140px' }}
                    >
                        {uniqueStatuses.map(s => (
                            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
                        ))}
                    </select>
                    <select
                        className="input-field"
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        style={{ marginBottom: 0, width: 'auto', minWidth: '180px' }}
                    >
                        {uniqueStages.map(s => (
                            <option key={s} value={s}>{s === 'ALL' ? 'All Stages' : s.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {filtered.length} of {applications.length}
                    </span>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-surface)' }}>
                        <tr>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>ID</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Applicant</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Type</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Amount</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Stage</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Created By / Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {applications.length === 0 ? 'No applications found. Create the first one!' : 'No applications match the current filters.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map(app => {
                                const { date, time } = formatDateTime(app.createdAt);
                                const createdBy = app.partner ? app.partner.name : 'Manual';
                                return (
                                    <tr key={app.id} onClick={() => navigate(`/applications/${app.id}`)} style={{ borderBottom: 'var(--border-subtle)', transition: 'var(--transition-fast)' }} className="hover-row">
                                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{app.id.substring(0, 8)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 500 }}>{app.applicant?.firstName} {app.applicant?.lastName}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.applicant?.passport || app.applicant?.ssn || ''}</div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{app.loanType?.name}</td>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{app.requestedAmount?.toLocaleString() || '—'} {app.loanType?.currency}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}><span className="text-secondary">{app.currentStage.replace(/_/g, ' ')}</span></td>
                                        <td style={{ padding: '1rem' }}>{getStatusBadge(app.status)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: app.partner ? '#42A5F5' : 'var(--text-primary)' }}>
                                                {createdBy}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {date} · {time}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                <style>{`
                    .hover-row:hover {
                        background-color: rgba(255, 255, 255, 0.02);
                        cursor: pointer;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Applications;
