import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const STAGES = [
    'ENTITIES',
    'ID_VERIFICATION',
    'INCOME_VERIFICATION',
    'CREDIT_BUREAU',
    'SCORING',
    'MANUAL_REVIEW',
    'CONTRACTS',
    'DISBURSEMENT',
    'CLOSED'
];

const ApplicationDetail = () => {
    const { t, i18n } = useTranslation();
    const { id, stage: stageParam } = useParams();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
    const [manualAmount, setManualAmount] = useState('');
    const [overrideRate, setOverrideRate] = useState('');
    const [serviceFee, setServiceFee] = useState('');
    const [armsoftTemplate, setArmsoftTemplate] = useState('CONSUMER_01');
    const [recalculatedAmount, setRecalculatedAmount] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpState, setOtpState] = useState('PENDING'); // PENDING, SENT, VERIFIED
    const [viewedStage, setViewedStage] = useState('');

    useEffect(() => {
        fetchApplication();
    }, [id]);

    const fetchApplication = async () => {
        try {
            const res = await api.get('/applications');
            const found = res.data.find(app => app.id === id);
            if (found) {
                setApplication(found);

                // Set viewedStage: prefer URL param on first load, then track currentStage changes
                if (stageParam && STAGES.includes(stageParam) && !viewedStage) {
                    setViewedStage(stageParam);
                } else if (!viewedStage || (application && found.currentStage !== application.currentStage)) {
                    setViewedStage(found.currentStage);
                }

                if (found.currentStage === 'MANUAL_REVIEW' && found.scoringData?.Offers?.length > 0) {
                    const firstValidOffer = found.scoringData.Offers.find(o => o.Limit > 0);
                    if (firstValidOffer) {
                        setManualAmount(firstValidOffer.Limit);
                        setOverrideRate(firstValidOffer.Rate);
                    }
                } else if (found.currentStage === 'MANUAL_REVIEW' && found.scoringData?.Limit) {
                    setManualAmount(found.scoringData.Limit);
                }

                if (found.currentStage === 'CONTRACTS') {
                    setRecalculatedAmount(found.finalCalculatedAmount || found.approvedAmount || '');
                    setBankAccount(found.bankAccountNumber || '');
                    setOtpState(found.otpStatus || 'PENDING');
                }
            } else {
                setErrorMsg('Application not found');
            }
        } catch (error) {
            console.error(error);
            setErrorMsg('Failed to load application details.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-progress from ID_VERIFICATION to INCOME_VERIFICATION if the ekeng mock was already run during lookup
    // Since we did the lookup in step 1, the DB might still say ID_VERIFICATION as the first stage.
    const advanceIdVerification = async () => {
        setActionLoading(true);
        try {
            await api.post(`/applications/${id}/stages/id-verification`);
            await fetchApplication();
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Failed ID Verification progression');
        } finally {
            setActionLoading(false);
        }
    };

    const runIncomeVerification = async () => {
        setActionLoading(true);
        try {
            await api.post(`/applications/${id}/stages/income`);
            await fetchApplication();
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Failed Income Verification progression');
        } finally {
            setActionLoading(false);
        }
    };

    const runCreditBureau = async () => {
        setActionLoading(true);
        try {
            await api.post(`/applications/${id}/stages/credit-bureau`);
            await fetchApplication();
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Failed Credit Bureau progression');
        } finally {
            setActionLoading(false);
        }
    };

    const runScoring = async () => {
        setActionLoading(true);
        try {
            await api.post(`/applications/${id}/stages/scoring`);
            await fetchApplication();
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Failed Scoring progression');
        } finally {
            setActionLoading(false);
        }
    };

    const runDisbursement = async () => {
        setActionLoading(true);
        try {
            await api.post(`/applications/${id}/stages/disbursement`);
            await fetchApplication();
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Failed Disbursement progression');
        } finally {
            setActionLoading(false);
        }
    };

    const downloadDocument = async (type) => {
        try {
            setActionLoading(true);
            const response = await api.get(`/applications/${id}/documents/${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_${id.substring(0, 8)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            setErrorMsg('Failed to download document');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="flex-row gap-2"><div className="spinner"></div> {t('common.loading')}</div>;
    if (!application) return <div>{errorMsg || t('applicationDetail.notFound')}</div>;

    const { applicant, loanType, currentStage, requestedAmount, requestedTenure } = application;

    return (
        <div className="animate-fade-in">
            <div className="flex-row justify-between" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>{t('applicationDetail.title')} <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>#{application.id.substring(0, 8)}</span></h1>
                    <p>{t('applicationDetail.currentStage')}: <strong style={{ color: 'var(--accent-base)' }}>{currentStage.replace(/_/g, ' ')}</strong></p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate(`/${i18n.language}/applications`)}>{t('applicationDetail.backToList')}</button>
            </div>

            {errorMsg && (
                <div style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255, 23, 68, 0.1)', borderLeft: '4px solid #FF8A80', color: '#FF8A80' }}>
                    <strong>{t('common.errorPrefix')}</strong> {errorMsg}
                </div>
            )}

            {/* Progress Bar Timeline */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }} className="hide-scroll">
                {STAGES.map((s) => {
                    const isCurrent = s === application.currentStage;
                    const isViewed = s === viewedStage;
                    const stageIndex = STAGES.indexOf(s);
                    const currentIdx = STAGES.indexOf(application.currentStage);
                    const isPast = stageIndex < currentIdx;
                    const isFuture = stageIndex > currentIdx;

                    if (s === 'CLOSED' && application.status !== 'REJECTED' && currentStage !== 'CLOSED') return null;

                    let bgColor = 'var(--bg-surface)';
                    let textColor = 'var(--text-secondary)';
                    let border = '1px solid var(--border-color)';

                    if (isCurrent) {
                        bgColor = application.status === 'REJECTED' ? 'rgba(255, 23, 68, 0.1)' : 'rgba(0, 230, 118, 0.1)';
                        textColor = application.status === 'REJECTED' ? '#FF1744' : '#00E676';
                        border = `1px solid ${textColor}`;
                    } else if (isPast) {
                        bgColor = 'var(--bg-panel)';
                        textColor = 'var(--text-primary)';
                    }

                    if (isViewed) {
                        border = '2px solid var(--accent-base)';
                        textColor = 'var(--text-primary)';
                    }

                    return (
                        <div
                            key={s}
                            onClick={() => {
                                if (!isFuture) {
                                    setViewedStage(s);
                                    navigate(`/${i18n.language}/applications/${id}/${s}`, { replace: true });
                                }
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: bgColor,
                                color: textColor,
                                border,
                                cursor: isFuture ? 'not-allowed' : 'pointer',
                                opacity: isFuture ? 0.5 : 1,
                                whiteSpace: 'nowrap',
                                fontSize: '0.85rem',
                                fontWeight: isViewed ? 'bold' : 'normal',
                                transition: 'all 0.2s',
                                userSelect: 'none'
                            }}
                        >
                            {t(`applicationDetail.stages.${s}`)}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Left Column: Data Summary */}
                <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass">
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>{t('applicationDetail.applicantDetails')}</h3>
                        <p><strong>{t('applicationDetail.name')}:</strong> {applicant.firstName} {applicant.lastName}</p>
                        <p><strong>{t('applicationDetail.ssn')}:</strong> {applicant.ssn || 'N/A'} | <strong>{t('applicationDetail.passport')}:</strong> {applicant.passport || 'N/A'}</p>
                        <p><strong>{t('applicationDetail.address')}:</strong> {applicant.address || 'N/A'}</p>
                        <p><strong>{t('applicationDetail.phone')}:</strong> {applicant.phone}</p>
                    </div>

                    <div className="card glass">
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>{t('applicationDetail.loanRequest')}</h3>
                        <p><strong>{t('applicationDetail.product')}:</strong> {loanType?.name} ({loanType?.currency})</p>
                        <p><strong>{t('applicationDetail.amountRequested')}:</strong> {requestedAmount.toLocaleString()} {loanType?.currency}</p>
                        <p><strong>{t('applicationDetail.tenureRequested')}:</strong> {requestedTenure} {t('applicationDetail.months')}</p>
                    </div>

                    {/* Show NORQ data if completed */}
                    {application.incomeVerificationData && (
                        <div className="card glass" style={{ borderLeft: '4px solid #00E676' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#00E676' }}>{t('applicationDetail.norqData')}</h3>
                            <p><strong>{t('applicationDetail.employer')}:</strong> {application.incomeVerificationData.employerName}</p>
                            <p><strong>{t('applicationDetail.position')}:</strong> {application.incomeVerificationData.position || 'N/A'}</p>
                            <p><strong>{t('applicationDetail.avgSalary')}:</strong> {application.incomeVerificationData.averageMonthlySalaryAMD.toLocaleString()} AMD</p>
                            <p><strong>{t('common.status')}:</strong> {application.incomeVerificationData.employmentStatus} ({application.incomeVerificationData.monthsEmployed} {t('applicationDetail.monthsRecorded')})</p>
                        </div>
                    )}

                    {/* Show ACRA data if completed */}
                    {application.creditBureauData && (
                        <div className="card glass" style={{ borderLeft: '4px solid #FF9100' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#FF9100' }}>{t('applicationDetail.acraData')}</h3>
                            <p><strong>{t('applicationDetail.totalLiabilities')}:</strong> {application.creditBureauData.PARTICIPIENT?.TotalLiabilitiesLoan?.Amount} {application.creditBureauData.PARTICIPIENT?.TotalLiabilitiesLoan?.Currency}</p>
                            <p><strong>{t('applicationDetail.activeLoans')}:</strong> {application.creditBureauData.PARTICIPIENT?.Loans?.Loan?.length || 0}</p>
                            <p><strong>{t('applicationDetail.responseSid')}:</strong> {application.creditBureauData.SID}</p>
                        </div>
                    )}

                    {/* Show Scoring data if completed */}
                    {application.scoringData && (
                        <div className="card glass" style={{ borderLeft: '4px solid #D500F9', background: 'rgba(213, 0, 249, 0.05)' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#D500F9' }}>{t('applicationDetail.dmsData')}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.creditScore')}</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{application.scoringData.Score}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.maxLimit')}</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{application.scoringData.Limit?.toLocaleString()} AMD</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.approvedAmount')}</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#00E676' }}>{application.approvedAmount?.toLocaleString()} AMD</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.assignedRate')}</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{application.assignedRate}%</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Stage Processing Actions & History View */}
                <div style={{ flex: '1 1 300px' }}>
                    <div className="card" style={{ background: 'var(--bg-surface)' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{t(`applicationDetail.stages.${viewedStage}`)} {t('applicationDetail.stageData')}</h3>

                        {/* ENTITIES VIEW */}
                        {viewedStage === 'ENTITIES' && (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.entities.dataLoadedIntake')}</p>
                                </div>

                                <div style={{ marginBottom: '1.5rem', background: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-base)', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('applicationDetail.entities.summary')}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <div style={{ gridColumn: 'span 2' }}><strong>{t('applicationDetail.entities.appId')}:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--accent-base)' }}>{application.id}</span></div>
                                        <div><strong>{t('applicationDetail.name')}:</strong> {applicant.firstName} {applicant.lastName}</div>
                                        <div><strong>{t('applicationDetail.passport')}:</strong> {applicant.passport || 'N/A'}</div>
                                        <div><strong>{t('applicationDetail.ssn')}:</strong> {applicant.ssn || 'N/A'}</div>
                                        <div><strong>{t('applicationDetail.phone')}:</strong> {applicant.phone}</div>
                                        <div><strong>{t('applicationDetail.email')}:</strong> {applicant.email}</div>
                                        <div><strong>{t('applicationDetail.address')}:</strong> {applicant.address || 'N/A'}</div>
                                    </div>
                                </div>

                                {/* Original Partner API Request */}
                                {application.kycData?.originalRequest && (
                                    <div style={{ marginBottom: '1.5rem', background: 'rgba(33, 150, 243, 0.05)', border: '1px solid rgba(33, 150, 243, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                                        <p style={{ fontSize: '0.85rem', color: '#42A5F5', marginBottom: '0.75rem', fontWeight: 'bold' }}>📨 {t('applicationDetail.entities.partnerRequest')}</p>
                                        <pre style={{ fontSize: '0.7rem', background: '#000', padding: '0.75rem', borderRadius: '4px', color: '#42A5F5', overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {JSON.stringify(application.kycData.originalRequest, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {!application.kycData?.originalRequest && (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.entities.noPartnerRequest')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ID VERIFICATION VIEW */}
                        {viewedStage === 'ID_VERIFICATION' && (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.inputData')}:</p>
                                    <p><strong>{t('applicationDetail.ssn')}:</strong> {applicant.ssn || 'N/A'}</p>
                                    <p><strong>{t('applicationDetail.id.providedDoc')}:</strong> {applicant.passport || 'N/A'}</p>
                                </div>

                                {/* PARTNER API KYC ATTACHMENTS */}
                                {application.kycData && (
                                    <div style={{ marginBottom: '1.5rem', background: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--accent-base)', marginBottom: '1rem', fontWeight: 'bold' }}>{t('applicationDetail.id.partnerKycData')}</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            {application.kycData.passportScanUrl && (
                                                <div>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('applicationDetail.id.passportScan')}</p>
                                                    <a href={application.kycData.passportScanUrl} target="_blank" rel="noopener noreferrer">
                                                        <img src={application.kycData.passportScanUrl} alt="Passport Scan" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-subtle)' }} />
                                                    </a>
                                                </div>
                                            )}
                                            {application.kycData.selfieUrl && (
                                                <div>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('applicationDetail.id.biometricSelfie')}</p>
                                                    <a href={application.kycData.selfieUrl} target="_blank" rel="noopener noreferrer">
                                                        <img src={application.kycData.selfieUrl} alt="Selfie" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-subtle)' }} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        {application.kycData.livenessData && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <details>
                                                    <summary style={{ fontSize: '0.8rem', color: 'var(--accent-base)', cursor: 'pointer', fontWeight: 'bold' }}>{t('applicationDetail.id.livenessData')}</summary>
                                                    <pre style={{ fontSize: '0.7rem', background: '#000', padding: '0.75rem', borderRadius: '4px', color: '#00E676', marginTop: '0.5rem', overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {JSON.stringify(application.kycData.livenessData, null, 2)}
                                                    </pre>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {application.idVerificationData ? (
                                    <>
                                        <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('applicationDetail.id.apiEnrichment')}</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                                <div><strong>{t('applicationDetail.firstName')}:</strong> {application.idVerificationData.data?.firstName}</div>
                                                <div><strong>{t('applicationDetail.lastName')}:</strong> {application.idVerificationData.data?.lastName}</div>
                                                <div><strong>{t('applicationDetail.passport')}:</strong> {application.idVerificationData.data?.passport || 'N/A'}</div>
                                                <div><strong>{t('applicationDetail.id.idCard')}:</strong> {application.idVerificationData.data?.idCard || 'N/A'}</div>
                                                <div style={{ gridColumn: 'span 2' }}><strong>{t('applicationDetail.id.biometric')}:</strong> {application.idVerificationData.data?.biometric || 'N/A'}</div>
                                            </div>
                                            <details>
                                                <summary style={{ fontSize: '0.75rem', color: 'var(--accent-base)', cursor: 'pointer' }}>{t('applicationDetail.viewRawJson')}</summary>
                                                <pre style={{ fontSize: '0.7rem', background: '#000', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', marginTop: '0.5rem' }}>
                                                    {JSON.stringify(application.idVerificationData, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.processResult')}:</p>
                                            <p><strong>{t('common.status')}:</strong> {application.idVerificationData.status === 'VERIFIED' ? <span style={{ color: '#00E676' }}>{t('applicationDetail.id.verifiedSuccess')}</span> : <span style={{ color: '#FF1744' }}>{t('applicationDetail.id.verificationFailed')}</span>}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.id.matchScore')}: {application.idVerificationData.matchScore}%</p>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.id.pending')}</p>
                                    </div>
                                )}

                                {currentStage === 'ID_VERIFICATION' && (
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                        <button className="btn btn-primary" onClick={advanceIdVerification} disabled={actionLoading} style={{ width: '100%' }}>
                                            {actionLoading ? t('applicationDetail.syncing') : t('applicationDetail.id.syncProceed')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* INCOME VERIFICATION VIEW */}
                        {viewedStage === 'INCOME_VERIFICATION' && (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.inputData')}:</p>
                                    <p><strong>{t('applicationDetail.ssn')}:</strong> {applicant.ssn}</p>
                                </div>

                                {application.incomeVerificationData ? (
                                    <>
                                        <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('applicationDetail.income.apiEnrichment')}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t('applicationDetail.income.workHistory')}: {application.incomeVerificationData.monthsEmployed} {t('applicationDetail.months')}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t('applicationDetail.employer')}: {application.incomeVerificationData.employerName}</p>
                                            <details style={{ marginTop: '0.5rem' }}>
                                                <summary style={{ fontSize: '0.75rem', color: 'var(--accent-base)', cursor: 'pointer' }}>{t('applicationDetail.viewRawJson')}</summary>
                                                <pre style={{ fontSize: '0.7rem', background: '#000', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', marginTop: '0.5rem' }}>
                                                    {JSON.stringify(application.incomeVerificationData, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.processResult')}:</p>
                                            <p><strong>{t('applicationDetail.avgSalary')}:</strong> <span style={{ color: '#00E676' }}>{application.incomeVerificationData.averageMonthlySalaryAMD.toLocaleString()} AMD</span></p>
                                            <p><strong>{t('common.status')}:</strong> {t('common.success')}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.income.waiting')}({applicant.ssn}).</p>
                                    </div>
                                )}

                                {currentStage === 'INCOME_VERIFICATION' && (
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                        <button className="btn btn-primary" onClick={runIncomeVerification} disabled={actionLoading} style={{ width: '100%', background: 'linear-gradient(45deg, #00C853, #00E676)' }}>
                                            {actionLoading ? t('applicationDetail.income.querying') : t('applicationDetail.income.runCheck')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CREDIT BUREAU VIEW */}
                        {viewedStage === 'CREDIT_BUREAU' && (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.inputData')}:</p>
                                    <p><strong>{t('applicationDetail.ssn')}:</strong> {applicant.ssn}</p>
                                    <p><strong>{t('applicationDetail.amountRequested')}:</strong> {requestedAmount} {loanType?.currency}</p>
                                </div>

                                {application.creditBureauData ? (
                                    <>
                                        <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('applicationDetail.credit.apiEnrichment')}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t('applicationDetail.totalLiabilities')}: {application.creditBureauData.PARTICIPIENT?.TotalLiabilitiesLoan?.Amount} {application.creditBureauData.PARTICIPIENT?.TotalLiabilitiesLoan?.Currency}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t('applicationDetail.activeLoans')}: {application.creditBureauData.PARTICIPIENT?.Loans?.Loan?.length || 0}</p>
                                            <details style={{ marginTop: '0.5rem' }}>
                                                <summary style={{ fontSize: '0.75rem', color: 'var(--accent-base)', cursor: 'pointer' }}>{t('applicationDetail.viewRawJson')}</summary>
                                                <pre style={{ fontSize: '0.7rem', background: '#000', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', marginTop: '0.5rem' }}>
                                                    {JSON.stringify(application.creditBureauData, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.processResult')}:</p>
                                            <p><strong>{t('common.status')}:</strong> {t('applicationDetail.credit.success')}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.credit.ready')}</p>
                                    </div>
                                )}

                                {currentStage === 'CREDIT_BUREAU' && (
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                        <button className="btn btn-primary" onClick={runCreditBureau} disabled={actionLoading} style={{ width: '100%', background: 'linear-gradient(45deg, #FF9100, #FF3D00)' }}>
                                            {actionLoading ? t('applicationDetail.credit.fetching') : t('applicationDetail.credit.runCheck')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SCORING VIEW */}
                        {viewedStage === 'SCORING' && (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.inputData')}:</p>
                                    <p><strong>{t('applicationDetail.scoring.payload')}:</strong> {t('applicationDetail.scoring.payloadDesc')}</p>
                                </div>

                                {application.scoringData ? (
                                    <>
                                        <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('applicationDetail.scoring.apiEnrichment')}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t('applicationDetail.scoring.engineDecision')}: {t('applicationDetail.scoring.evaluated')}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t('applicationDetail.creditScore')}: {application.scoringData.Score}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t('applicationDetail.scoring.offersFound')}: {application.scoringData.Offers?.length || 0}</p>

                                            <details style={{ marginTop: '0.5rem' }}>
                                                <summary style={{ fontSize: '0.75rem', color: 'var(--accent-base)', cursor: 'pointer' }}>{t('applicationDetail.viewRawJson')}</summary>
                                                <pre style={{ fontSize: '0.7rem', background: '#000', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', marginTop: '0.5rem' }}>
                                                    {JSON.stringify(application.scoringData, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.processResult')}:</p>
                                            <p><strong>{t('applicationDetail.scoring.calculatedLimit')}:</strong> <span style={{ color: '#D500F9', fontWeight: 'bold' }}>{application.scoringData.Limit?.toLocaleString()} AMD</span></p>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.scoring.pending')}</p>
                                    </div>
                                )}

                                {currentStage === 'SCORING' && (
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                        <button className="btn btn-primary" onClick={runScoring} disabled={actionLoading} style={{ width: '100%', background: 'linear-gradient(45deg, #D500F9, #AA00FF)' }}>
                                            {actionLoading ? t('applicationDetail.scoring.evaluating') : t('applicationDetail.scoring.runEngine')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MANUAL REVIEW VIEW */}
                        {viewedStage === 'MANUAL_REVIEW' && (
                            <div>
                                {application.manualReviewData ? (
                                    <>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.inputData')}:</p>
                                            <p><strong>{t('applicationDetail.manualReview.adminReviewed')}:</strong> {t('applicationDetail.manualReview.dmsOffersDesc')}</p>
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.processResult')}:</p>
                                            <p><strong>{t('applicationDetail.manualReview.decision')}:</strong> <span style={{ color: application.manualReviewData.decision === 'REJECT' ? '#FF1744' : '#00E676', fontWeight: 'bold' }}>{application.manualReviewData.decision}</span></p>
                                            <p><strong>{t('applicationDetail.manualReview.finalAmount')}:</strong> {application.approvedAmount?.toLocaleString()} AMD</p>
                                            <p><strong>{t('applicationDetail.manualReview.finalRate')}:</strong> {application.assignedRate}%</p>
                                            {application.serviceFee !== null && <p><strong>{t('loanTypes.serviceFee')}:</strong> {application.serviceFee}</p>}
                                            {application.armsoftTemplate && <p><strong>{t('loanTypes.armsoftTemplate')}:</strong> {application.armsoftTemplate}</p>}
                                        </div>
                                    </>
                                ) : currentStage === 'MANUAL_REVIEW' ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ background: 'rgba(213,0,249,0.1)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(213,0,249,0.3)', textAlign: 'left' }}>
                                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('applicationDetail.manualReview.title')}</h4>

                                            {application.scoringData?.Offers?.length > 0 ? (
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('applicationDetail.manualReview.selectOffer')}:</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {application.scoringData.Offers.map((offer, idx) => (
                                                            <label key={idx} style={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: selectedOfferIndex === idx ? '#D500F9' : 'var(--border-color)', borderRadius: '6px', padding: '0.75rem', cursor: 'pointer', background: selectedOfferIndex === idx ? 'rgba(213,0,249,0.1)' : 'transparent' }}>
                                                                <input
                                                                    type="radio"
                                                                    name="offerSelection"
                                                                    checked={selectedOfferIndex === idx}
                                                                    onChange={() => {
                                                                        setSelectedOfferIndex(idx);
                                                                        setManualAmount(offer.Limit);
                                                                        setOverrideRate(offer.Rate);
                                                                    }}
                                                                    style={{ marginRight: '1rem' }}
                                                                />
                                                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span><strong>{offer.Limit.toLocaleString()} AMD</strong> / {offer.Duration} {t('applicationDetail.months')}</span>
                                                                    <span style={{ color: 'var(--text-secondary)' }}>{offer.Rate}% ({t('applicationDetail.manualReview.fee')}: {offer.MonthlyCommission}%)</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('applicationDetail.manualReview.noOffers')}</p>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                                                <div className="form-group" style={{ marginBottom: '0' }}>
                                                    <label>{t('applicationDetail.manualReview.finalApprovedAmount')} (AMD)</label>
                                                    <input
                                                        type="number"
                                                        className="input-field"
                                                        value={manualAmount}
                                                        onChange={(e) => setManualAmount(e.target.value)}
                                                        placeholder={t('applicationDetail.manualReview.enterAmount')}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '0' }}>
                                                    <label>{t('applicationDetail.manualReview.apr')}</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="input-field"
                                                        value={overrideRate}
                                                        onChange={(e) => setOverrideRate(e.target.value)}
                                                        placeholder="e.g. 14.5"
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '0' }}>
                                                    <label>{t('loanTypes.serviceFee')}</label>
                                                    <input
                                                        type="number"
                                                        className="input-field"
                                                        value={serviceFee}
                                                        onChange={(e) => setServiceFee(e.target.value)}
                                                        placeholder="e.g. 10000"
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: '0' }}>
                                                    <label>{t('loanTypes.armsoftTemplate')}</label>
                                                    <select
                                                        className="input-field"
                                                        value={armsoftTemplate}
                                                        onChange={(e) => setArmsoftTemplate(e.target.value)}
                                                    >
                                                        <option value="CONSUMER_01">{t('applicationDetail.manualReview.templateConsumer')}</option>
                                                        <option value="CASH_LOAN">{t('applicationDetail.manualReview.templateCash')}</option>
                                                        <option value="TECH_CREDIT">{t('applicationDetail.manualReview.templateTech')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '1.5rem' }}>
                                                {t('applicationDetail.manualReview.overrideWarning')}
                                            </small>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ flex: 1, background: '#00E676', border: 'none', color: '#000' }}
                                                onClick={async () => {
                                                    setActionLoading(true);
                                                    try {
                                                        await api.post(`/applications/${id}/stages/manual-review`, {
                                                            decision: 'APPROVE',
                                                            finalAmount: Number(manualAmount),
                                                            selectedOfferIndex,
                                                            overrideRate: overrideRate ? Number(overrideRate) : undefined,
                                                            serviceFee: serviceFee ? Number(serviceFee) : undefined,
                                                            armsoftTemplate
                                                        });
                                                        await fetchApplication();
                                                    } catch (error) {
                                                        setErrorMsg(error.response?.data?.error || 'Failed to approve application');
                                                    } finally {
                                                        setActionLoading(false);
                                                    }
                                                }}
                                                disabled={actionLoading}
                                            >
                                                {t('applicationDetail.manualReview.approveLoan')}
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ flex: 1, color: '#FF1744', border: '1px solid #FF1744' }}
                                                onClick={async () => {
                                                    setActionLoading(true);
                                                    try {
                                                        await api.post(`/applications/${id}/stages/manual-review`, { decision: 'REJECT' });
                                                        await fetchApplication();
                                                    } catch (error) {
                                                        setErrorMsg(error.response?.data?.error || 'Failed to reject application');
                                                    } finally {
                                                        setActionLoading(false);
                                                    }
                                                }}
                                                disabled={actionLoading}
                                            >
                                                {t('applicationDetail.manualReview.reject')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.manualReview.rejectedPending')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CONTRACTS VIEW */}
                        {viewedStage === 'CONTRACTS' && (
                            <div>
                                {(application.currentStage === 'CONTRACTS' || application.status === 'APPROVED' || application.status === 'DISBURSED') ? (
                                    <>
                                        <div style={{ marginBottom: '1.5rem', background: '#00E67620', padding: '1rem', borderRadius: '8px', border: '1px solid #00E676' }}>
                                            <h4 style={{ marginBottom: '0.5rem', color: '#00E676' }}>{t('applicationDetail.contracts.approved')}</h4>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.contracts.maxLimit')}: <strong>{application.approvedAmount?.toLocaleString()} AMD</strong></p>
                                        </div>

                                        {currentStage === 'CONTRACTS' && !application.repaymentSchedule && (
                                            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                <h4 style={{ marginBottom: '1rem' }}>{t('applicationDetail.contracts.finalizeTerms')}</h4>
                                                <div className="form-group">
                                                    <label>{t('applicationDetail.contracts.requestedFinalAmount')} (AMD)</label>
                                                    <input
                                                        type="number"
                                                        className="input-field"
                                                        value={recalculatedAmount}
                                                        onChange={(e) => setRecalculatedAmount(e.target.value)}
                                                        max={application.approvedAmount}
                                                    />
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%' }}
                                                    onClick={async () => {
                                                        setActionLoading(true);
                                                        try {
                                                            await api.post(`/applications/${id}/recalculate`, { finalAmount: recalculatedAmount });
                                                            await fetchApplication();
                                                        } catch (error) {
                                                            setErrorMsg(error.response?.data?.error || 'Recalculation failed');
                                                        } finally {
                                                            setActionLoading(false);
                                                        }
                                                    }}
                                                    disabled={actionLoading || !recalculatedAmount || recalculatedAmount > application.approvedAmount}
                                                >
                                                    {t('applicationDetail.contracts.calculateSchedule')}
                                                </button>
                                            </div>
                                        )}

                                        {application.repaymentSchedule && (
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <h4 style={{ marginBottom: '1rem' }}>{t('applicationDetail.contracts.loanSchedule')}</h4>
                                                <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                        <p><strong>{t('applicationDetail.contracts.calculatedAmount')}:</strong> {application.finalCalculatedAmount?.toLocaleString()} AMD</p>
                                                        <p><strong>{t('applicationDetail.manualReview.apr')}:</strong> {application.assignedRate}%</p>
                                                        <p><strong>{t('applicationDetail.tenure')}:</strong> {application.approvedTenure} {t('applicationDetail.months')}</p>
                                                    </div>
                                                </div>
                                                <details style={{ marginBottom: '1rem' }}>
                                                    <summary style={{ cursor: 'pointer', color: 'var(--accent-base)' }}>{t('applicationDetail.contracts.viewScheduleList')}</summary>
                                                    <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', background: '#000', padding: '0.5rem', borderRadius: '4px' }}>
                                                        <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ padding: '4px', borderBottom: '1px solid #333' }}>{t('applicationDetail.contracts.month')}</th>
                                                                    <th style={{ padding: '4px', borderBottom: '1px solid #333' }}>{t('applicationDetail.contracts.payment')}</th>
                                                                    <th style={{ padding: '4px', borderBottom: '1px solid #333' }}>{t('applicationDetail.contracts.principal')}</th>
                                                                    <th style={{ padding: '4px', borderBottom: '1px solid #333' }}>{t('applicationDetail.contracts.interest')}</th>
                                                                    <th style={{ padding: '4px', borderBottom: '1px solid #333' }}>{t('applicationDetail.contracts.balance')}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {application.repaymentSchedule.map(row => (
                                                                    <tr key={row.month}>
                                                                        <td style={{ padding: '4px', borderBottom: '1px solid #222' }}>{row.month} • {row.paymentDate}</td>
                                                                        <td style={{ padding: '4px', borderBottom: '1px solid #222' }}>{row.paymentAmount}</td>
                                                                        <td style={{ padding: '4px', borderBottom: '1px solid #222' }}>{row.principal}</td>
                                                                        <td style={{ padding: '4px', borderBottom: '1px solid #222' }}>{row.interest}</td>
                                                                        <td style={{ padding: '4px', borderBottom: '1px solid #222' }}>{row.remainingBalance}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </details>

                                                {currentStage === 'CONTRACTS' && (
                                                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                        <h4 style={{ marginBottom: '1rem' }}>{t('applicationDetail.contracts.signAndIssue')}</h4>

                                                        <div className="form-group">
                                                            <label>{t('applicationDetail.contracts.bankAccount')}</label>
                                                            <input
                                                                type="text"
                                                                className="input-field"
                                                                placeholder="AM000000000000000000"
                                                                value={bankAccount}
                                                                onChange={(e) => setBankAccount(e.target.value)}
                                                                disabled={otpState === 'SENT' || otpState === 'VERIFIED'}
                                                            />
                                                        </div>

                                                        {otpState === 'PENDING' && (
                                                            <button
                                                                className="btn btn-secondary"
                                                                style={{ width: '100%' }}
                                                                onClick={async () => {
                                                                    setActionLoading(true);
                                                                    try {
                                                                        await api.post(`/applications/${id}/otp/send`);
                                                                        await fetchApplication();
                                                                    } catch (error) {
                                                                        setErrorMsg(error.response?.data?.error || 'Failed to send OTP');
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                                disabled={actionLoading || !bankAccount}
                                                            >
                                                                {t('applicationDetail.contracts.generateAndSend')}
                                                            </button>
                                                        )}

                                                        {(otpState === 'SENT' || otpState === 'VERIFIED') && (
                                                            <div style={{ marginTop: '1rem' }}>
                                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                                                                    <button
                                                                        className="btn btn-secondary"
                                                                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', color: '#00E676', border: '1px solid #00E676' }}
                                                                        onClick={() => downloadDocument('contract')}
                                                                    >
                                                                        📄 {t('applicationDetail.contracts.viewContract')}
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-secondary"
                                                                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', color: '#00E676', border: '1px solid #00E676' }}
                                                                        onClick={() => downloadDocument('individual-paper')}
                                                                    >
                                                                        📄 {t('applicationDetail.contracts.viewIndivPaper')}
                                                                    </button>
                                                                </div>

                                                                {otpState === 'SENT' && (
                                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                                        <input
                                                                            type="text"
                                                                            className="input-field"
                                                                            placeholder={t('applicationDetail.contracts.enterOtp')}
                                                                            value={otpCode}
                                                                            onChange={(e) => setOtpCode(e.target.value)}
                                                                            style={{ flex: 2, marginBottom: 0 }}
                                                                        />
                                                                        <button
                                                                            className="btn btn-primary"
                                                                            style={{ flex: 1, background: '#D500F9', border: 'none' }}
                                                                            onClick={async () => {
                                                                                setActionLoading(true);
                                                                                try {
                                                                                    await api.post(`/applications/${id}/otp/verify`, { otp: otpCode });
                                                                                    await fetchApplication();
                                                                                } catch (error) {
                                                                                    setErrorMsg(error.response?.data?.error || 'Failed to verify OTP');
                                                                                } finally {
                                                                                    setActionLoading(false);
                                                                                }
                                                                            }}
                                                                            disabled={actionLoading || otpCode.length < 4}
                                                                        >
                                                                            {t('applicationDetail.contracts.signVerify')}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.contracts.pendingApproval')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DISBURSEMENT VIEW */}
                        {viewedStage === 'DISBURSEMENT' && (
                            <div>
                                {application.disbursementData ? (
                                    <>
                                        <div style={{ marginBottom: '1.5rem', background: '#00E67620', padding: '1rem', borderRadius: '8px', border: '1px solid #00E676' }}>
                                            <h4 style={{ marginBottom: '0.5rem', color: '#00E676' }}>{t('applicationDetail.disbursement.fundsDisbursed')}</h4>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('applicationDetail.disbursement.transactionId')}: <strong>{application.disbursementData.transactionId}</strong></p>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                        <h4 style={{ marginBottom: '1rem' }}>{t('applicationDetail.disbursement.finalDisbursement')}</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('applicationDetail.disbursement.ready')}</p>
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', background: 'linear-gradient(45deg, #00C853, #00E676)' }}
                                            onClick={runDisbursement}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? t('applicationDetail.disbursement.processing') : t('applicationDetail.disbursement.processArmsoft')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CLOSED VIEW */}
                        {viewedStage === 'CLOSED' && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ background: application.status === 'REJECTED' ? '#FF174420' : '#00E67620', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: `1px solid ${application.status === 'REJECTED' ? '#FF1744' : '#00E676'}` }}>
                                    <h4 style={{ marginBottom: '0.5rem', color: application.status === 'REJECTED' ? '#FF1744' : '#00E676' }}>{t('applicationDetail.closed.applicationStatus')} {application.status}</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {application.status === 'REJECTED'
                                            ? t('applicationDetail.closed.rejected')
                                            : t('applicationDetail.closed.disbursed')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* More stages will drop in here as the pipeline expands */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationDetail;
