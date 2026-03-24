import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const NewApplication = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loanTypes, setLoanTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // --- Identity Fetch State ---
    const [lookupQuery, setLookupQuery] = useState('');
    const [fetchingIdentity, setFetchingIdentity] = useState(false);
    const [identityVerified, setIdentityVerified] = useState(false);

    // --- OTP State ---
    const [phoneOtp, setPhoneOtp] = useState({ sent: false, verified: false, code: '' });
    const [emailOtp, setEmailOtp] = useState({ sent: false, verified: false, code: '' });

    // --- Application State ---
    const [formData, setFormData] = useState({
        // Extracted identity data
        firstName: '',
        lastName: '',
        ssn: '',
        passport: '',
        birthDate: '',
        citizenship: '',
        address: '', // Official Registration Address

        // Manual inputs
        factualAddressIsSame: true,
        factualAddress: '',
        email: '',
        phone: '',
        requestedAmount: '',
        requestedTenure: '',
        loanTypeId: ''
    });

    useEffect(() => {
        api.get('/loan-types').then(res => {
            const adminTypes = res.data.filter(lt => !lt.isPartnerOriginated);
            setLoanTypes(adminTypes);
            if (adminTypes.length > 0) {
                const defaultLt = adminTypes[0];
                setFormData(prev => ({
                    ...prev,
                    loanTypeId: defaultLt.id,
                    requestedAmount: defaultLt.minAmount,
                    requestedTenure: defaultLt.minTenure
                }));
            }
        }).catch(err => {
            setErrorMsg('Failed to load Loan Products. Please check your connection.');
        });
    }, []);

    const selectedLoanType = loanTypes.find(lt => lt.id === formData.loanTypeId);

    const handleLoanTypeChange = (e) => {
        const id = e.target.value;
        const lt = loanTypes.find(l => l.id === id);
        setFormData(prev => ({
            ...prev,
            loanTypeId: id,
            // Reset to defaults for the new type
            requestedAmount: lt ? lt.minAmount : prev.requestedAmount,
            requestedTenure: lt ? lt.minTenure : prev.requestedTenure
        }));
        if (errorMsg) setErrorMsg('');
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
        if (errorMsg) setErrorMsg(''); // Clear error when user types
    };

    const handleLookup = async () => {
        const query = lookupQuery.trim();
        if (!query) return;

        setFetchingIdentity(true);
        setErrorMsg('');
        setIdentityVerified(false);

        let isSsn = false;

        // Perform format validation
        if (/^\d{10}$/.test(query)) {
            // SSN is exactly 10 digits
            isSsn = true;
        } else if (/^\d{9}$/.test(query)) {
            // Identity Card / Biometric is exactly 9 digits
            isSsn = false;
        } else if (/^[A-Za-z]{2}\d{7}$/.test(query)) {
            // Passport is exactly 2 letters followed by 7 digits
            isSsn = false;
        } else {
            setErrorMsg("Invalid format. Must be an SSN (10 digits), Identity Card/Biometric (9 digits), or Passport (2 letters, 7 digits).");
            setFetchingIdentity(false);
            return;
        }

        try {
            const queryParam = isSsn ? `ssn=${query}` : `passport=${query}`;
            const fullQuery = formData.loanTypeId ? `${queryParam}&loanTypeId=${formData.loanTypeId}` : queryParam;

            const res = await api.get(`/applicants/lookup?${fullQuery}`);
            const data = res.data.data; // { firstName, lastName, documentNumber, isResident, address, birthDate, citizenship }

            setFormData(prev => ({
                ...prev,
                firstName: data.firstName,
                lastName: data.lastName,
                [isSsn ? 'ssn' : 'passport']: data.documentNumber,
                address: data.address || '',
                factualAddress: data.address || '',
                birthDate: data.birthDate || '',
                citizenship: data.citizenship || ''
            }));

            setIdentityVerified(true);
        } catch (error) {
            console.error('Identity lookup failed:', error);
            setErrorMsg(error.response?.data?.error || "Identity Verification Failed. Applicant not found in registry.");
        } finally {
            setFetchingIdentity(false);
        }
    };

    const handleSendOtp = (type) => {
        if (type === 'phone' && !formData.phone) {
            setErrorMsg("Please provide a Phone Number before sending OTP.");
            return;
        }
        if (type === 'email' && !formData.email) {
            setErrorMsg("Please provide an Email Address before sending OTP.");
            return;
        }
        setErrorMsg('');
        // Mock sending OTP
        setTimeout(() => {
            if (type === 'phone') setPhoneOtp(prev => ({ ...prev, sent: true }));
            if (type === 'email') setEmailOtp(prev => ({ ...prev, sent: true }));
        }, 800);
    };

    const handleVerifyOtp = (type) => {
        const state = type === 'phone' ? phoneOtp : emailOtp;
        if (state.code.length < 4) {
            setErrorMsg(`Invalid OTP code for ${type}. Please enter the 4-digit code.`);
            return;
        }
        setErrorMsg('');
        // Mock Verifying OTP
        setTimeout(() => {
            if (type === 'phone') setPhoneOtp(prev => ({ ...prev, verified: true, sent: false }));
            if (type === 'email') setEmailOtp(prev => ({ ...prev, verified: true, sent: false }));
        }, 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!identityVerified) {
            setErrorMsg("Please verify the applicant's identity via Ekeng lookup first.");
            return;
        }
        if (!phoneOtp.verified || !emailOtp.verified) {
            setErrorMsg("Please verify both phone and email via OTP.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            // Determine the final address to save (usually backends keep residential vs real, for now we merge or pick)
            const finalAddress = formData.factualAddressIsSame ? formData.address : formData.factualAddress;

            // Send unified flat payload to the Application API (matching Partner API schema)
            const applicationRes = await api.post('/applications', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                ssn: formData.ssn,
                passport: formData.passport,
                address: finalAddress,
                phone: formData.phone,
                email: formData.email,
                loanTypeId: formData.loanTypeId,
                requestedAmount: parseInt(formData.requestedAmount, 10),
                requestedTenure: parseInt(formData.requestedTenure, 10)
            });

            // Application is now auto-progressed straight to MANUAL_REVIEW. Redirect.
            navigate(`/${i18n.language}/applications/${applicationRes.data.id}`);
        } catch (error) {
            console.error('Failed to run origination logic:', error);
            const backendError = error.response?.data?.error;
            setErrorMsg(backendError || "Failed to create application. Ensure the backend is running and fields are valid.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex-row justify-between" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>{t('newApplication.title')}</h1>
                    <p>{t('newApplication.subtitle')}</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '750px', margin: '0 auto' }}>
                {errorMsg && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        background: 'rgba(255, 23, 68, 0.1)',
                        borderLeft: '4px solid #FF8A80',
                        color: '#FF8A80',
                        borderRadius: '0 4px 4px 0'
                    }}>
                        <strong>Error:</strong> {errorMsg}
                    </div>
                )}

                {/* ID LOOKUP SECTION */}
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--accent-base)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('newApplication.step1')}
                        {identityVerified && <span style={{ color: '#00E676', fontSize: '1rem' }}>{t('newApplication.verified')}</span>}
                    </h3>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="input-label">{t('newApplication.enterSsnOrPassport')}</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. 1702920925"
                                value={lookupQuery}
                                onChange={(e) => setLookupQuery(e.target.value)}
                                disabled={identityVerified}
                            />
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleLookup}
                            disabled={fetchingIdentity || !lookupQuery || identityVerified}
                        >
                            {fetchingIdentity ? t('newApplication.querying') : identityVerified ? t('newApplication.dataLocked') : t('newApplication.fetchIdentity')}
                        </button>
                        {identityVerified && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setIdentityVerified(false); setLookupQuery(''); }}
                            >
                                {t('newApplication.reset')}
                            </button>
                        )}
                    </div>

                    {/* Pre-fill display if verified */}
                    {identityVerified && (
                        <div className="animate-fade-in" style={{ marginTop: '1.5rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #00E676' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('newApplication.officialData')}</h4>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="input-label">{t('newApplication.firstName')}</label>
                                    <input type="text" className="input-field" value={formData.firstName} disabled style={{ background: 'transparent' }} />
                                </div>
                                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="input-label">{t('newApplication.lastName')}</label>
                                    <input type="text" className="input-field" value={formData.lastName} disabled style={{ background: 'transparent' }} />
                                </div>
                                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="input-label">{t('newApplication.citizenship')}</label>
                                    <input type="text" className="input-field" value={formData.citizenship || 'ARM'} disabled style={{ background: 'transparent' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="input-label">{t('newApplication.dob')}</label>
                                    <input type="text" className="input-field" value={formData.birthDate ? formData.birthDate.substring(0, 10) : ''} disabled style={{ background: 'transparent' }} />
                                </div>
                                <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                                    <label className="input-label">{t('newApplication.registeredAddress')}</label>
                                    <input type="text" className="input-field" value={formData.address} disabled style={{ background: 'transparent' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* MAIN APPLICATION FORM */}
                <form onSubmit={handleSubmit} style={{ opacity: identityVerified ? 1 : 0.5, pointerEvents: identityVerified ? 'auto' : 'none' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-base)' }}>{t('newApplication.step2')}</h3>

                    {/* Factual Address */}
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: formData.factualAddressIsSame ? '0' : '1rem' }}>
                            <input
                                type="checkbox"
                                name="factualAddressIsSame"
                                checked={formData.factualAddressIsSame}
                                onChange={handleChange}
                            />
                            <strong>{t('newApplication.sameAddress')}</strong>
                        </label>

                        {!formData.factualAddressIsSame && (
                            <div className="input-group animate-fade-in" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('newApplication.factualAddress')}</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    name="factualAddress"
                                    value={formData.factualAddress}
                                    onChange={handleChange}
                                    placeholder="City, Street, Apartment..."
                                    required={!formData.factualAddressIsSame}
                                />
                            </div>
                        )}
                    </div>

                    {/* Phone & Email with OTP */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Phone Row */}
                        <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="input-label">{t('newApplication.phone')}</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="+374..."
                                    disabled={phoneOtp.sent || phoneOtp.verified}
                                />
                            </div>

                            {!phoneOtp.verified ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                    {!phoneOtp.sent ? (
                                        <button type="button" className="btn btn-secondary" onClick={() => handleSendOtp('phone')} style={{ width: '100%' }}>
                                            {t('newApplication.sendOtp')}
                                        </button>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                className="input-field animate-fade-in"
                                                placeholder={t('newApplication.placeholder4digit')}
                                                maxLength="4"
                                                value={phoneOtp.code}
                                                onChange={(e) => setPhoneOtp({ ...phoneOtp, code: e.target.value })}
                                                style={{ flex: 1, marginBottom: 0 }}
                                            />
                                            <button type="button" className="btn btn-primary animate-fade-in" onClick={() => handleVerifyOtp('phone')}>
                                                {t('newApplication.verify')}
                                            </button>
                                            <button type="button" className="btn btn-secondary animate-fade-in" onClick={() => setPhoneOtp({ ...phoneOtp, sent: false, code: '' })}>
                                                {t('common.cancel')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div style={{ flex: 1, color: '#00E676', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                                    {t('newApplication.phoneVerified')}
                                </div>
                            )}
                        </div>

                        {/* Email Row */}
                        <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="input-label">{t('newApplication.email')}</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="applicant@example.com"
                                    disabled={emailOtp.sent || emailOtp.verified}
                                />
                            </div>

                            {!emailOtp.verified ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                    {!emailOtp.sent ? (
                                        <button type="button" className="btn btn-secondary" onClick={() => handleSendOtp('email')} style={{ width: '100%' }}>
                                            {t('newApplication.sendOtp')}
                                        </button>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                className="input-field animate-fade-in"
                                                placeholder={t('newApplication.placeholder4digit')}
                                                maxLength="4"
                                                value={emailOtp.code}
                                                onChange={(e) => setEmailOtp({ ...emailOtp, code: e.target.value })}
                                                style={{ flex: 1, marginBottom: 0 }}
                                            />
                                            <button type="button" className="btn btn-primary animate-fade-in" onClick={() => handleVerifyOtp('email')}>
                                                {t('newApplication.verify')}
                                            </button>
                                            <button type="button" className="btn btn-secondary animate-fade-in" onClick={() => setEmailOtp({ ...emailOtp, sent: false, code: '' })}>
                                                {t('common.cancel')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div style={{ flex: 1, color: '#00E676', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                                    {t('newApplication.emailVerified')}
                                </div>
                            )}
                        </div>
                    </div>

                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-base)' }}>{t('newApplication.step3')}</h3>
                    <div className="input-group" style={{ marginTop: '1.5rem' }}>
                        <label className="input-label">{t('newApplication.selectProduct')}</label>
                        <select className="input-field" name="loanTypeId" value={formData.loanTypeId} onChange={handleLoanTypeChange} required>
                            {loanTypes.map(lt => (
                                <option key={lt.id} value={lt.id}>{lt.name} ({lt.currency})</option>
                            ))}
                        </select>
                    </div>

                    {selectedLoanType && (
                        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="input-label">
                                    {t('newApplication.amountRequested')}
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '0.4rem' }}>
                                        ({t('newApplication.min')}: {selectedLoanType.minAmount.toLocaleString()})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    name="requestedAmount"
                                    value={formData.requestedAmount}
                                    onChange={handleChange}
                                    min={selectedLoanType.minAmount}
                                    max={selectedLoanType.maxAmount}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="input-label">
                                    {t('newApplication.tenure')}
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '0.4rem' }}>
                                        ({t('newApplication.max')}: {selectedLoanType.maxTenure})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    name="requestedTenure"
                                    value={formData.requestedTenure}
                                    onChange={handleChange}
                                    min={selectedLoanType.minTenure}
                                    max={selectedLoanType.maxTenure}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/${i18n.language}/applications`)}>{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !identityVerified || !phoneOtp.verified || !emailOtp.verified}>
                            {loading ? t('newApplication.creatingBtn') : t('newApplication.createBtn')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewApplication;
