import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const DEFAULT_CONFIG = {
    credit: {
        requireCreditHistory: false,
        minCreditHistoryLength: '',
        maxOverdueDays12Months: '',
        maxOverdueDays24Months: '',
        maxOverdueDays36Months: '',
        maxDefaultedLoans: '',
        maxOverdueLoanContracts: '',
        maxSumOverdueAmount: '',
        maxCreditRequests7Days: '',
        maxCreditRequests30Days: ''
    },
    income: {
        requireWorkExistence: false,
        minMonthsCurrentWorkplace: '',
        minMonthsCurrentEmployer: '',
        minSalaryAmount: ''
    }
};

const ScoreConfiguration = () => {
    const { t } = useTranslation();
    const [loanTypes, setLoanTypes] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState(DEFAULT_CONFIG);

    useEffect(() => {
        fetchLoanTypes();
    }, []);

    const fetchLoanTypes = async () => {
        try {
            const response = await api.get('/loan-types');
            setLoanTypes(response.data);
            if (response.data.length > 0) {
                handleSelectType(response.data[0].id, response.data);
            }
        } catch (error) {
            console.error('Failed to fetch loan types', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectType = (id, types = loanTypes) => {
        setSelectedId(id);
        setErrorMsg('');
        setSuccessMsg('');
        const selected = types.find(lt => lt.id === id);
        if (selected) {
            const rawConfig = selected.scoreConfig || DEFAULT_CONFIG;
            // Map backend 0s to '' for clean empty UI inputs
            const uiConfig = JSON.parse(JSON.stringify(rawConfig));
            for (const category in uiConfig) {
                if (typeof uiConfig[category] === 'object') {
                    for (const key in uiConfig[category]) {
                        if (uiConfig[category][key] === 0) {
                            uiConfig[category][key] = '';
                        }
                    }
                }
            }
            setFormData(uiConfig);
        }
    };

    const handleChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const loanType = loanTypes.find(lt => lt.id === selectedId);
            if (!loanType) return;

            // Map UI empty strings '' back to 0 for backend persistence
            const dbPayload = JSON.parse(JSON.stringify(formData));
            for (const category in dbPayload) {
                if (typeof dbPayload[category] === 'object') {
                    for (const key in dbPayload[category]) {
                        if (dbPayload[category][key] === '') {
                            dbPayload[category][key] = 0;
                        }
                    }
                }
            }

            // Submit only the raw score configuration directly to the sub-resource endpoint
            await api.put(`/loan-types/${selectedId}/score-config`, dbPayload);

            // Update local state copy
            setLoanTypes(loanTypes.map(lt => lt.id === selectedId ? { ...lt, scoreConfig: dbPayload } : lt));
            setSuccessMsg(t('scoreConfig.saveSuccess'));

            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Failed to save score config', error);
            setErrorMsg(error.response?.data?.error || t('scoreConfig.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex-row gap-2"><div className="spinner"></div> {t('common.loading')}</div>;

    if (loanTypes.length === 0) {
        return (
            <div className="animate-fade-in">
                <h1>{t('scoreConfig.title')}</h1>
                <p>{t('scoreConfig.noLoanTypes')}</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="flex-row justify-between" style={{ marginBottom: '2.5rem', alignItems: 'flex-start' }}>
                <div>
                    <h1>{t('scoreConfig.title')}</h1>
                    <p>{t('scoreConfig.subtitle')}</p>
                </div>
                <div style={{ minWidth: '320px' }}>
                    <select
                        className="input-field"
                        value={selectedId}
                        onChange={(e) => handleSelectType(e.target.value)}
                        style={{ margin: 0, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--accent-base)' }}
                    >
                        {loanTypes.map(lt => (
                            <option key={lt.id} value={lt.id}>
                                {lt.name} ({lt.productId})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {errorMsg && (
                <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-error)' }}>
                    <strong>{t('common.errorPrefix')}</strong> {errorMsg}
                </div>
            )}
            {successMsg && (
                <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--status-success)' }}>
                    <strong style={{ color: 'var(--status-success)' }}>{successMsg}</strong>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* INCOME CHECKS */}
                    <div className="glass-card">
                        <div className="flex-row justify-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#a5b4fc' }}>{t('scoreConfig.incomeChecks')}</h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{t('scoreConfig.requireWorkExistence')}</span>
                                <div className="toggle-switch">
                                    <input type="checkbox" checked={formData.income.requireWorkExistence} onChange={(e) => handleChange('income', 'requireWorkExistence', e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </div>
                            </label>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.minMonthsCurrentWorkplace')}</label>
                                <input type="number" className="input-field" value={formData.income.minMonthsCurrentWorkplace} onChange={(e) => handleChange('income', 'minMonthsCurrentWorkplace', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.income.requireWorkExistence} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.minMonthsCurrentEmployer')}</label>
                                <input type="number" className="input-field" value={formData.income.minMonthsCurrentEmployer} onChange={(e) => handleChange('income', 'minMonthsCurrentEmployer', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.income.requireWorkExistence} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.minSalaryAmount')}</label>
                                <input type="number" className="input-field" value={formData.income.minSalaryAmount} onChange={(e) => handleChange('income', 'minSalaryAmount', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.income.requireWorkExistence} />
                            </div>
                        </div>
                    </div>

                    {/* CREDIT HISTORY CHECKS */}
                    <div className="glass-card">
                        <div className="flex-row justify-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#a5b4fc' }}>{t('scoreConfig.creditChecks')}</h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{t('scoreConfig.requireCreditHistory')}</span>
                                <div className="toggle-switch">
                                    <input type="checkbox" checked={formData.credit.requireCreditHistory} onChange={(e) => handleChange('credit', 'requireCreditHistory', e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </div>
                            </label>
                        </div>

                        {/* Subgroup: Length */}
                        <h4 style={{ marginTop: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('scoreConfig.groupLength')}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.minCreditHistoryLength')}</label>
                                <input type="number" className="input-field" value={formData.credit.minCreditHistoryLength} onChange={(e) => handleChange('credit', 'minCreditHistoryLength', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                        </div>

                        {/* Subgroup: Current State */}
                        <h4 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('scoreConfig.groupState')}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.maxDefaultedLoans')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxDefaultedLoans} onChange={(e) => handleChange('credit', 'maxDefaultedLoans', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.maxOverdueLoanContracts')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxOverdueLoanContracts} onChange={(e) => handleChange('credit', 'maxOverdueLoanContracts', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('scoreConfig.maxSumOverdueAmount')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxSumOverdueAmount} onChange={(e) => handleChange('credit', 'maxSumOverdueAmount', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                        </div>

                        {/* Subgroup: Delays */}
                        <h4 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('scoreConfig.groupDelays')}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.maxOverdueDays12Months')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxOverdueDays12Months} onChange={(e) => handleChange('credit', 'maxOverdueDays12Months', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.maxOverdueDays24Months')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxOverdueDays24Months} onChange={(e) => handleChange('credit', 'maxOverdueDays24Months', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.maxOverdueDays36Months')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxOverdueDays36Months} onChange={(e) => handleChange('credit', 'maxOverdueDays36Months', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                        </div>

                        {/* Subgroup: Requests */}
                        <h4 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('scoreConfig.groupRequests')}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.maxCreditRequests7Days')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxCreditRequests7Days} onChange={(e) => handleChange('credit', 'maxCreditRequests7Days', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('scoreConfig.maxCreditRequests30Days')}</label>
                                <input type="number" className="input-field" value={formData.credit.maxCreditRequests30Days} onChange={(e) => handleChange('credit', 'maxCreditRequests30Days', e.target.value === '' ? '' : Number(e.target.value))} min="0" disabled={!formData.credit.requireCreditHistory} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', padding: '1.25rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '0.85rem 3rem', fontSize: '1.1rem', background: 'var(--accent-gradient)', borderColor: 'transparent' }}>
                        {submitting ? t('scoreConfig.saving') : t('scoreConfig.saveBtn')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ScoreConfiguration;
