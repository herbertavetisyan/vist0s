import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const ALL_APPLICANT_TYPES = ['PERSON', 'LEGAL_ENTITY', 'IE'];
const ALL_ROLES = ['APPLICANT', 'CO_APPLICANT', 'GUARANTOR', 'PLEDGER'];
const ALL_STAGES = [
    'ENTITIES', 'ID_VERIFICATION', 'INCOME_VERIFICATION',
    'CREDIT_BUREAU', 'SCORING', 'MANUAL_REVIEW',
    'CONTRACTS', 'DISBURSEMENT'
];

const DEFAULT_STAGES = ALL_STAGES.map(s => ({ name: s, required: s !== 'MANUAL_REVIEW' }));

const LoanTypes = () => {
    const { t } = useTranslation();
    const [loanTypes, setLoanTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        productId: '',
        currency: 'AMD',
        minAmount: 100000,
        maxAmount: 5000000,
        minTenure: 3,
        maxTenure: 60,
        allowedApplicantTypes: ['PERSON'],
        allowedRoles: ['APPLICANT'],
        requiredDocuments: [],
        stagesConfig: DEFAULT_STAGES,
        isPartnerOriginated: false
    });

    useEffect(() => {
        fetchLoanTypes();
    }, []);

    const fetchLoanTypes = async () => {
        try {
            const response = await api.get('/loan-types');
            setLoanTypes(response.data);
        } catch (error) {
            console.error('Failed to fetch loan types', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
        if (errorMsg) setErrorMsg('');
    };

    const handleCheckboxArray = (e, fieldName) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const currentArray = prev[fieldName] || [];
            if (checked) {
                return { ...prev, [fieldName]: [...currentArray, value] };
            } else {
                return { ...prev, [fieldName]: currentArray.filter(item => item !== value) };
            }
        });
    };

    const addDocument = () => {
        setFormData(prev => ({
            ...prev,
            requiredDocuments: [...(prev.requiredDocuments || []), { id: Date.now().toString(), name: '', required: true, description: '' }]
        }));
    };

    const updateDocument = (index, field, value) => {
        setFormData(prev => {
            const newDocs = [...prev.requiredDocuments];
            newDocs[index][field] = value;
            return { ...prev, requiredDocuments: newDocs };
        });
    };

    const removeDocument = (index) => {
        setFormData(prev => {
            const newDocs = [...prev.requiredDocuments];
            newDocs.splice(index, 1);
            return { ...prev, requiredDocuments: newDocs };
        });
    };

    const toggleStage = (stageName) => {
        setFormData(prev => {
            const currentStages = prev.stagesConfig || [];
            // Deep copy the stages to ensure React detects the change
            const newStages = currentStages.map(stage => ({ ...stage }));
            const stageIndex = newStages.findIndex(s => s.name === stageName);

            if (stageIndex >= 0) {
                newStages[stageIndex].required = !newStages[stageIndex].required;
            } else {
                newStages.push({ name: stageName, required: true });
            }
            return { ...prev, stagesConfig: newStages };
        });
    };

    const openCreateForm = () => {
        setEditingId(null);
        setErrorMsg('');
        setFormData({
            name: '',
            productId: '',
            currency: 'AMD',
            minAmount: 100000,
            maxAmount: 5000000,
            minTenure: 3,
            maxTenure: 60,
            allowedApplicantTypes: ['PERSON'],
            allowedRoles: ['APPLICANT'],
            requiredDocuments: [],
            stagesConfig: DEFAULT_STAGES,
            isPartnerOriginated: false
        });
        setShowForm(true);
    };

    const openEditForm = (loanType) => {
        setEditingId(loanType.id);
        setErrorMsg('');

        // Ensure stages array is somewhat complete for UI rendering
        const existingStages = loanType.stagesConfig || [];
        const mergedStages = ALL_STAGES.map(s => {
            const found = existingStages.find(es => es.name === s);
            return found ? found : { name: s, required: false };
        });

        setFormData({
            name: loanType.name,
            productId: loanType.productId || '',
            currency: loanType.currency,
            minAmount: loanType.minAmount,
            maxAmount: loanType.maxAmount,
            minTenure: loanType.minTenure,
            maxTenure: loanType.maxTenure,
            allowedApplicantTypes: loanType.allowedApplicantTypes || ['PERSON'],
            allowedRoles: loanType.allowedRoles || ['APPLICANT'],
            requiredDocuments: loanType.requiredDocuments || [],
            stagesConfig: mergedStages,
            isPartnerOriginated: loanType.isPartnerOriginated || false
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        try {
            if (editingId) {
                const res = await api.put(`/loan-types/${editingId}`, formData);
                setLoanTypes(loanTypes.map(lt => lt.id === editingId ? res.data : lt));
            } else {
                const res = await api.post('/loan-types', formData);
                setLoanTypes([res.data, ...loanTypes]);
            }
            setShowForm(false);
        } catch (error) {
            console.error('Failed to save loan type', error);
            const backendError = error.response?.data?.error;
            setErrorMsg(backendError || t('loanTypes.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('loanTypes.confirmDelete'))) return;
        try {
            await api.delete(`/loan-types/${id}`);
            setLoanTypes(loanTypes.filter(lt => lt.id !== id));
        } catch (error) {
            console.error('Failed to delete loan type', error);
            alert(error.response?.data?.error || t('loanTypes.deleteError'));
        }
    };

    if (loading) return <div className="flex-row gap-2"><div className="spinner"></div> {t('common.loading')}</div>;

    return (
        <div>
            <div className="flex-row justify-between" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>{t('loanTypes.title')}</h1>
                    <p>{t('loanTypes.subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={showForm ? () => setShowForm(false) : openCreateForm}>
                    {showForm ? t('common.cancel') : t('loanTypes.newBtn')}
                </button>
            </div>

            {showForm && (
                <div className="glass-card animate-fade-in" style={{ marginBottom: '2.5rem', borderTop: '2px solid var(--accent-base)' }}>
                    {errorMsg && (
                        <div style={{
                            padding: '1.25rem',
                            marginBottom: '1.5rem',
                            borderLeft: '4px solid var(--status-error)',
                            borderRadius: '0 4px 4px 0'
                        }}>
                            <strong style={{ color: 'var(--status-error)' }}>Error:</strong> {errorMsg}
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-base)' }}>
                            {editingId ? t('loanTypes.editTitle') : t('loanTypes.createTitle')}
                        </h3>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="input-group" style={{ flex: 2 }}>
                                <label className="input-label">{t('loanTypes.productName')}</label>
                                <input type="text" className="input-field" name="name" value={formData.name} onChange={handleChange} placeholder={t('loanTypes.namePlaceholder')} required autoFocus />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">{t('loanTypes.productId')}</label>
                                <input type="text" className="input-field" name="productId" value={formData.productId} onChange={handleChange} placeholder={t('loanTypes.idPlaceholder')} required />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">{t('loanTypes.currency')}</label>
                                <select className="input-field" name="currency" value={formData.currency} onChange={handleChange}>
                                    <option value="AMD">AMD</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>

                        {/* Partner Originated Toggle */}
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--accent-base)' }}>
                                <input
                                    type="checkbox"
                                    name="isPartnerOriginated"
                                    checked={formData.isPartnerOriginated}
                                    onChange={(e) => setFormData({ ...formData, isPartnerOriginated: e.target.checked })}
                                    style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent-base)' }}
                                />
                                {t('loanTypes.isPartnerOriginated')}
                            </label>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', marginLeft: '2rem' }}>
                                {t('loanTypes.partnerHelper')}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">{t('loanTypes.minAmount')}</label>
                                <input type="number" className="input-field" name="minAmount" value={formData.minAmount} onChange={handleChange} min="0" required />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">{t('loanTypes.maxAmount')}</label>
                                <input type="number" className="input-field" name="maxAmount" value={formData.maxAmount} onChange={handleChange} min="0" required />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">{t('loanTypes.minTenure')}</label>
                                <input type="number" className="input-field" name="minTenure" value={formData.minTenure} onChange={handleChange} min="1" required />
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">{t('loanTypes.maxTenure')}</label>
                                <input type="number" className="input-field" name="maxTenure" value={formData.maxTenure} onChange={handleChange} min="1" required />
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1.5rem 0' }} />

                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>{t('loanTypes.allowedApplicantTypes')}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {ALL_APPLICANT_TYPES.map(type => (
                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                value={type}
                                                checked={formData.allowedApplicantTypes.includes(type)}
                                                onChange={(e) => handleCheckboxArray(e, 'allowedApplicantTypes')}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>{t('loanTypes.allowedRoles')}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {ALL_ROLES.map(role => (
                                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                value={role}
                                                checked={formData.allowedRoles.includes(role)}
                                                onChange={(e) => handleCheckboxArray(e, 'allowedRoles')}
                                            />
                                            {role}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1.5rem 0' }} />

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4>{t('loanTypes.requiredDocuments')}</h4>
                                <button type="button" className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={addDocument}>
                                    {t('loanTypes.addDocument')}
                                </button>
                            </div>

                            {formData.requiredDocuments.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('loanTypes.noDocuments')}</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {formData.requiredDocuments.map((doc, idx) => (
                                        <div key={doc.id || idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                            <div className="input-group" style={{ marginBottom: 0, flex: 2 }}>
                                                <input type="text" className="input-field" placeholder={t('loanTypes.docNamePlaceholder')} value={doc.name} onChange={(e) => updateDocument(idx, 'name', e.target.value)} required />
                                            </div>
                                            <div className="input-group" style={{ marginBottom: 0, flex: 3 }}>
                                                <input type="text" className="input-field" placeholder={t('loanTypes.docDescPlaceholder')} value={doc.description} onChange={(e) => updateDocument(idx, 'description', e.target.value)} />
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                <input type="checkbox" checked={doc.required} onChange={(e) => updateDocument(idx, 'required', e.target.checked)} />
                                                {t('common.mandatory')}
                                            </label>
                                            <button type="button" className="btn btn-secondary" style={{ color: '#FF8A80', borderColor: 'transparent', padding: '0.5rem' }} onClick={() => removeDocument(idx)}>
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1.5rem 0' }} />

                        <div>
                            <h4 style={{ marginBottom: '1rem' }}>{t('loanTypes.stageLifecycle')}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {formData.stagesConfig.map(stage => (
                                    <label key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: stage.required ? '1px solid var(--accent-base)' : '1px solid transparent' }}>
                                        <input
                                            type="checkbox"
                                            checked={stage.required}
                                            onChange={() => toggleStage(stage.name)}
                                        />
                                        <span style={{ fontWeight: 500 }}>{stage.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? t('loanTypes.saving') : t('loanTypes.saveConfig')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <tr>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t('loanTypes.table.nameId')}</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t('loanTypes.table.limits')}</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{t('loanTypes.table.docsReq')}</th>
                            <th style={{ padding: '1rem', borderBottom: 'var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>{t('loanTypes.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loanTypes.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {t('loanTypes.noProducts')}
                                </td>
                            </tr>
                        ) : (
                            loanTypes.map(lt => (
                                <tr key={lt.id} style={{ borderBottom: 'var(--border-subtle)' }} className="hover-row">
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 500 }}>{lt.name} <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({lt.productId}) {lt.currency}</span></div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                            {(lt.allowedApplicantTypes || []).join(', ')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                        <div>{lt.minAmount.toLocaleString()} - {lt.maxAmount.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('loanTypes.tenure')}: {lt.minTenure}-{lt.maxTenure} {t('loanTypes.monthsAbbr')}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                        {(lt.requiredDocuments || []).length} {t('loanTypes.items')}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', marginRight: '0.5rem' }}
                                            onClick={() => openEditForm(lt)}
                                        >
                                            {t('loanTypes.editFullConfig')}
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderColor: 'rgba(255, 23, 68, 0.3)', color: '#FF8A80' }}
                                            onClick={() => handleDelete(lt.id)}
                                        >
                                            {t('loanTypes.delete')}
                                        </button>
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

export default LoanTypes;
