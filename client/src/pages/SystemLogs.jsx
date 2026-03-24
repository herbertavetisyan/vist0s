import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const LEVEL_STYLES = {
    error: { bg: 'rgba(255,23,68,0.12)', color: '#FF8A80', border: 'rgba(255,23,68,0.3)' },
    warn: { bg: 'rgba(255,171,0,0.12)', color: '#FFE57F', border: 'rgba(255,171,0,0.3)' },
    info: { bg: 'rgba(0,230,118,0.10)', color: '#69F0AE', border: 'rgba(0,230,118,0.25)' },
    debug: { bg: 'rgba(130,177,255,0.1)', color: '#82B1FF', border: 'rgba(41,98,255,0.3)' },
};

const LevelBadge = ({ level }) => {
    const s = LEVEL_STYLES[level] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: 'rgba(255,255,255,0.1)' };
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.border}`,
        }}>
            {level || 'LOG'}
        </span>
    );
};

const SystemLogs = () => {
    const { t } = useTranslation();
    const { token } = useContext(AuthContext);
    const [logFiles, setLogFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [logContent, setLogContent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterLevel, setFilterLevel] = useState('all');

    useEffect(() => {
        fetchLogFiles();
    }, []);

    const fetchLogFiles = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogFiles(response.data);
            if (response.data.length > 0) {
                fetchLogContent(response.data[0].name);
            }
            setError('');
        } catch (err) {
            setError(t('systemLogs.fetchFilesError'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogContent = async (filename) => {
        try {
            setLoading(true);
            setSelectedFile(filename);
            const response = await axios.get(`/api/logs/${filename}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogContent(response.data.reverse());
            setError('');
        } catch (err) {
            setError(t('systemLogs.fetchContentError', { filename }));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logContent.filter(log =>
        filterLevel === 'all' || log.level === filterLevel
    );

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: 0 }}>
            {/* Page Header */}
            <header style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {t('systemLogs.title')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.9rem' }}>
                    {t('systemLogs.subtitle')}
                </p>
            </header>

            {error && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,23,68,0.1)',
                    border: '1px solid rgba(255,23,68,0.3)',
                    borderRadius: 'var(--border-radius-sm)',
                    color: '#FF8A80',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    flexShrink: 0
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Main Panel */}
            <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
                {/* File List Sidebar */}
                <div style={{
                    width: '220px',
                    flexShrink: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 'var(--border-radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.02)',
                        flexShrink: 0
                    }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                            {t('systemLogs.fileList')}
                        </span>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                        {loading && !logFiles.length ? (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('common.loading')}</div>
                        ) : logFiles.length === 0 ? (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('systemLogs.noFiles')}</div>
                        ) : (
                            logFiles.map(file => (
                                <button
                                    key={file.name}
                                    onClick={() => fetchLogContent(file.name)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.625rem 0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: selectedFile === file.name ? 'var(--accent-glow)' : 'transparent',
                                        color: selectedFile === file.name ? 'var(--accent-base)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        fontWeight: selectedFile === file.name ? 600 : 400,
                                        fontSize: '0.875rem',
                                        marginBottom: '2px',
                                        display: 'block'
                                    }}
                                    onMouseEnter={e => { if (selectedFile !== file.name) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={e => { if (selectedFile !== file.name) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {file.name}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {(file.size / 1024).toFixed(1)} {t('systemLogs.kb')}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Log Viewer */}
                <div style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 'var(--border-radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Toolbar */}
                    <div style={{
                        padding: '0.75rem 1.25rem',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        flexShrink: 0
                    }}>
                        <span style={{ fontSize: '0.875rem', color: selectedFile ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500 }}>
                            {selectedFile ? `📄 ${selectedFile}` : t('systemLogs.selectFile')}
                        </span>

                        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                            <select
                                value={filterLevel}
                                onChange={e => setFilterLevel(e.target.value)}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">{t('systemLogs.allLevels')}</option>
                                <option value="info">{t('systemLogs.info')}</option>
                                <option value="warn">{t('systemLogs.warn')}</option>
                                <option value="error">{t('systemLogs.error')}</option>
                            </select>
                            <button
                                onClick={() => selectedFile && fetchLogContent(selectedFile)}
                                disabled={!selectedFile || loading}
                                className="btn btn-secondary"
                                style={{ padding: '0.375rem 0.875rem', fontSize: '0.8rem', gap: '0.375rem' }}
                            >
                                {loading ? <div className="spinner" style={{ width: '12px', height: '12px' }} /> : '↻'}
                                {t('systemLogs.refresh')}
                            </button>
                        </div>
                    </div>

                    {/* Log Rows */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading && logContent.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                {t('systemLogs.loading')}
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {t('systemLogs.noMatch')}
                            </div>
                        ) : (
                            filteredLogs.map((log, idx) => (
                                <div
                                    key={log.id || idx}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '160px 70px 1fr',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1.25rem',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        transition: 'background 0.1s',
                                        fontSize: '0.85rem',
                                        alignItems: 'start'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Timestamp */}
                                    <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem', paddingTop: '2px' }}>
                                        {log.timestamp}
                                    </div>

                                    {/* Level badge */}
                                    <div style={{ paddingTop: '2px' }}>
                                        <LevelBadge level={log.level} />
                                    </div>

                                    {/* Message + Payload */}
                                    <div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.35rem', lineHeight: 1.4 }}>
                                            {log.message}
                                        </div>
                                        {Object.keys(log)
                                            .filter(k => !['level', 'message', 'timestamp', 'id', 'service'].includes(k))
                                            .map(key => (
                                                <div key={key} style={{
                                                    background: 'rgba(255,255,255,0.04)',
                                                    padding: '0.375rem 0.625rem',
                                                    borderRadius: '4px',
                                                    margin: '3px 0',
                                                    fontSize: '0.78rem',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--text-secondary)',
                                                    wordBreak: 'break-all',
                                                    border: '1px solid rgba(255,255,255,0.06)'
                                                }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>{key}: </span>
                                                    {typeof log[key] === 'object'
                                                        ? JSON.stringify(log[key], null, 2)
                                                        : String(log[key])}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;
