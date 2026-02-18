import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import applicationService from '../services/applicationService';

const ApplicationJourney = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const applicationId = searchParams.get('id');
    const stageParam = searchParams.get('stage');

    const [adminView, setAdminView] = useState(stageParam); // null or stage name
    const [adminActiveTab, setAdminActiveTab] = useState('summary'); // summary or json

    // Sync adminView to URL for routing/sharing
    const toggleAdminView = (stageName) => {
        const newVal = stageName === adminView ? null : stageName;
        setAdminView(newVal);

        // Update URL
        const newParams = new URLSearchParams(searchParams);
        if (newVal) {
            newParams.set('stage', newVal);
        } else {
            newParams.delete('stage');
        }
        navigate(`?${newParams.toString()}`, { replace: true });
    };

    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [step, setStep] = useState('LOADING'); // LOADING, SCORING, OFFER, SIGNING, OTP, DISBURSEMENT, SUCCESS

    const [selection, setSelection] = useState({
        selectedAmount: 0,
        selectedTerm: 0
    });

    const [otpCode, setOtpCode] = useState('');
    const [disbursement, setDisbursement] = useState({
        bankName: '',
        accountNumber: ''
    });

    useEffect(() => {
        if (!applicationId) {
            setError('No application ID provided.');
            setLoading(false);
            return;
        }
        fetchStatus();
    }, [applicationId]);

    const fetchStatus = async () => {
        try {
            const data = await applicationService.getApplicationStatus(applicationId);
            setApplication(data);
            determineStep(data);

            // Set initial selection if offer is ready
            if (data.status === 'OFFER_READY' && selection.selectedAmount === 0) {
                setSelection({
                    selectedAmount: data.approvedLimit,
                    selectedTerm: data.approvedTerm
                });
            }
        } catch (err) {
            setError('Failed to fetch application status.');
        } finally {
            setLoading(false);
        }
    };

    const determineStep = (app) => {
        // Map status to visual step/screen
        switch (app.status) {
            case 'ENRICHING':
                setStep('SCORING');
                break;
            case 'OFFER_READY':
                setStep('OFFER');
                break;
            case 'OFFER_SELECTED':
                setStep('SIGNING');
                break;
            case 'SIGNING_COMPLETE':
                setStep('DISBURSEMENT');
                break;
            case 'OTP_VERIFIED':
                setStep('DISBURSEMENT');
                break;
            case 'DISBURSED':
                setStep('SUCCESS');
                break;
            case 'REJECTED':
                setStep('REJECTED');
                break;
            default:
                setStep('LOADING');
        }
    };

    // Polling for scoring
    useEffect(() => {
        if (step !== 'SCORING') return;

        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [step]);

    const handleSelectOffer = async () => {
        setLoading(true);
        try {
            await applicationService.selectOffer(applicationId, selection);
            await fetchStatus();
        } catch (err) {
            setError('Failed to select offer.');
            setLoading(false);
        }
    };

    const handleSign = async () => {
        setLoading(true);
        try {
            await applicationService.signDocument(applicationId);
            await fetchStatus();
        } catch (err) {
            setError('Failed to sign document.');
            setLoading(false);
        }
    };

    const handleRequestOTP = async () => {
        try {
            const res = await applicationService.requestOTP(applicationId);
            alert(`MOCK SMS: Your code is ${res._mock_code}`);
        } catch (err) {
            setError('Failed to request OTP.');
        }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);
        try {
            await applicationService.verifyOTP(applicationId, otpCode);
            await fetchStatus();
        } catch (err) {
            setError('Invalid OTP code.');
            setLoading(false);
        }
    };

    const handleSubmitDisbursement = async () => {
        setLoading(true);
        try {
            await applicationService.submitDisbursement(applicationId, disbursement);
            await fetchStatus();
        } catch (err) {
            setError('Failed to submit disbursement details.');
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setLoading(true);
        try {
            await applicationService.approveApplication(applicationId);
            await fetchStatus();
        } catch (err) {
            setError('Failed to approve application.');
            setLoading(false);
        }
    };

    const handleReject = async () => {
        setLoading(true);
        try {
            await applicationService.rejectApplication(applicationId);
            await fetchStatus();
        } catch (err) {
            setError('Failed to reject application.');
            setLoading(false);
        }
    };


    const renderAdminStageData = () => {
        if (!adminView) return null;

        const applicant = application?.participants?.find(p => p.role === 'APPLICANT')?.entity;
        const ekengResult = application?.enrichment?.results?.find(r => r.serviceName === 'ekeng');
        const norqResult = application?.enrichment?.results?.find(r => r.serviceName === 'norq');
        const acraResult = application?.enrichment?.results?.find(r => r.serviceName === 'acra');
        const dmsResult = application?.enrichment?.results?.find(r => r.serviceName === 'dms');

        let rawData = null;
        if (adminView === 'Entities') rawData = { applicant, questionnaire: application?.applicationData };
        if (adminView === 'ID Verification') rawData = { api: ekengResult?.responseData, log: application?.logs?.find(l => l.action === 'IDENTITY_VERIFICATION') };
        if (adminView === 'Income Verification') rawData = norqResult?.responseData;
        if (adminView === 'Credit Bureau') rawData = acraResult?.responseData;
        if (adminView === 'Scoring') rawData = dmsResult?.responseData;

        return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-inner mb-8 overflow-hidden">
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setAdminActiveTab('summary')}
                            className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${adminActiveTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            📊 Formatted View
                        </button>
                        <button
                            onClick={() => setAdminActiveTab('json')}
                            className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${adminActiveTab === 'json' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {'{ }'} Raw JSON
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">INSID: {adminView.toUpperCase()}</span>
                        <button onClick={() => toggleAdminView(adminView)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
                    </div>
                </div>

                <div className="p-6">
                    {adminActiveTab === 'json' ? (
                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-[400px]">
                            <pre>{JSON.stringify(rawData, null, 2)}</pre>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-800">
                            {adminView === 'Entities' && (
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="font-bold border-b pb-2 text-blue-800">Borrower Profile</h4>
                                        <div className="space-y-2">
                                            <p><span className="text-gray-500">Full Name (Latin):</span> {applicant?.firstName} {applicant?.lastName}</p>
                                            <p><span className="text-gray-500">FullName (AM):</span> {applicant?.firstNameNonLatin} {applicant?.lastNameNonLatin}</p>
                                            <p><span className="text-gray-500">SSN / National ID:</span> <span className="font-mono font-bold">{applicant?.nationalId}</span></p>
                                            <p><span className="text-gray-500">Phone:</span> {applicant?.phoneNumber}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-bold border-b pb-2 text-blue-800">Questionnaire</h4>
                                        <div className="space-y-2">
                                            {Object.entries(application.applicationData || {}).map(([k, v]) => (
                                                <p key={k}><span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span> {v}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminView === 'ID Verification' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <h4 className="font-bold mb-4 text-blue-800">Automated Comparison Logic</h4>
                                        {rawData?.log ? (
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-xs text-gray-400 uppercase">
                                                        <th className="pb-2">Field</th>
                                                        <th className="pb-2">Application (Provided)</th>
                                                        <th className="pb-2">Registry (EKENG)</th>
                                                        <th className="pb-2">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {Object.entries(JSON.parse(rawData.log.details).matches).map(([field, isMatch]) => {
                                                        const details = JSON.parse(rawData.log.details).details;
                                                        const fName = field === 'firstName' ? 'First Name' : field === 'lastName' ? 'Last Name' : 'Date of Birth';
                                                        const key = field === 'birthDate' ? 'dob' : field;
                                                        return (
                                                            <tr key={field} className="py-2">
                                                                <td className="py-3 font-medium">{fName}</td>
                                                                <td>{details.db[key]}</td>
                                                                <td>{details.api[key]}</td>
                                                                <td>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isMatch ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {isMatch ? 'MATCH' : 'MISMATCH'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : <p className="italic text-gray-400">No verification log found for this stage.</p>}
                                    </div>
                                </div>
                            )}

                            {adminView === 'Income Verification' && (
                                <div className="space-y-6">
                                    <h4 className="font-bold text-blue-800">NORQ Employment History</h4>
                                    <div className="grid gap-4">
                                        {(rawData?.argWorkData?.WorkData_v2018 || []).slice(0, 3).map((job, i) => (
                                            <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-gray-800">{job.WorkName}</p>
                                                    <p className="text-xs text-gray-400">Entry: {job.EntryDate?.split('T')[0]}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono font-bold text-green-600">{parseInt(job.Salary).toLocaleString()} AMD</p>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Monthly Salary</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminView === 'Credit Bureau' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-white rounded-lg border text-center shadow-sm">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Risk Score</p>
                                            <p className="text-3xl font-black text-blue-600 font-mono">{rawData?.creditScore || '720'}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-lg border text-center shadow-sm">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Total Liabilities</p>
                                            <p className="text-xl font-bold text-gray-800">{parseInt(rawData?.PARTICIPIENT?.TotalLiabilitiesLoan?.Amount || 0).toLocaleString()} AMD</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-lg border text-center shadow-sm">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Inquiries (30d)</p>
                                            <p className="text-xl font-bold text-gray-800">{rawData?.PARTICIPIENT?.SelfInquiryQuantity30 || 0}</p>
                                        </div>
                                    </div>

                                    {/* Active Loans */}
                                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                                        <h5 className="bg-blue-600 px-4 py-2 text-xs font-bold text-white uppercase flex justify-between">
                                            <span>Active Loans</span>
                                            <span>{(rawData?.PARTICIPIENT?.Loans?.Loan || []).filter(l => l.CreditStatus === 'գործող').length}</span>
                                        </h5>
                                        <div className="divide-y">
                                            {(rawData?.PARTICIPIENT?.Loans?.Loan || []).filter(l => l.CreditStatus === 'գործող').map((loan, idx) => (
                                                <div key={idx} className="p-4 flex justify-between items-center hover:bg-blue-50/30 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-blue-900">{loan.SourceName}</p>
                                                        <p className="text-xs text-blue-600 font-medium">{loan.CreditType} • {loan.TheLoanClass}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-mono font-bold text-gray-900">{parseInt(loan.ContractAmount).toLocaleString()} {loan.Currency}</p>
                                                        <p className="text-[10px] text-gray-400">Bal: {parseInt(loan.AmountDue || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(rawData?.PARTICIPIENT?.Loans?.Loan || []).filter(l => l.CreditStatus === 'գործող').length === 0 && (
                                                <p className="p-4 text-sm text-gray-400 italic text-center">No active loans found.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Closed Loans */}
                                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                                        <h5 className="bg-gray-800 px-4 py-2 text-xs font-bold text-white uppercase flex justify-between">
                                            <span>Closed Loans</span>
                                            <span>{(rawData?.PARTICIPIENT?.Loans?.Loan || []).filter(l => l.CreditStatus === 'մարված').length}</span>
                                        </h5>
                                        <div className="divide-y max-h-[200px] overflow-auto">
                                            {(rawData?.PARTICIPIENT?.Loans?.Loan || []).filter(l => l.CreditStatus === 'մարված').map((loan, idx) => (
                                                <div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{loan.SourceName}</p>
                                                        <p className="text-[10px] text-gray-400">{loan.CreditType} • {loan.TheLoanClass}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-mono text-sm font-bold text-gray-500">{parseInt(loan.ContractAmount).toLocaleString()} {loan.Currency}</p>
                                                        <p className="text-[10px] text-green-600 font-bold">SETTLED</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Inquiries / Applications */}
                                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                                        <h5 className="bg-yellow-500 px-4 py-2 text-xs font-bold text-white uppercase flex justify-between">
                                            <span>Recent Applications (Inquiries)</span>
                                            <span>{(rawData?.PARTICIPIENT?.Inquiries?.Inquiry || []).length}</span>
                                        </h5>
                                        <div className="divide-y">
                                            {(rawData?.PARTICIPIENT?.Inquiries?.Inquiry || []).map((inquiry, idx) => (
                                                <div key={idx} className="p-3 flex justify-between items-center hover:bg-yellow-50/30 transition-colors">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{inquiry.SourceName}</p>
                                                        <p className="text-[10px] text-yellow-700 font-medium">{inquiry.InquiryReason}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-mono font-bold text-gray-500">{inquiry.InquiryDate}</p>
                                                        <p className="text-[10px] text-gray-400 italic">ACRA Check</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminView === 'Scoring' && (
                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-900 mb-4">DMS Automated Decision Engine</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <p className="flex justify-between border-b pb-2"><span className="text-blue-700">Recommendation:</span> <span className="font-bold text-green-600">{rawData?.recommendation}</span></p>
                                            <p className="flex justify-between border-b pb-2"><span className="text-blue-700">Risk Score:</span> <span className="font-bold">{rawData?.aggregatedRiskScore}/100</span></p>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="flex justify-between border-b pb-2"><span className="text-blue-700">Approved Limit:</span> <span className="font-bold">{rawData?.decisions?.limit?.toLocaleString()} AMD</span></p>
                                            <p className="flex justify-between border-b pb-2"><span className="text-blue-700">Approved Rate:</span> <span className="font-bold text-red-600">{rawData?.decisions?.rate}%</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {['Contracts', 'Disbursement'].includes(adminView) && (
                                <div className="text-center py-10 text-gray-400 italic">
                                    Detailed UI parsing for {adminView} is being implemented based on legal requirements.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
                <p className="text-red-600">{error}</p>
                <button
                    onClick={() => navigate('/enrichment')}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Back to Enrichment
                </button>
            </div>
        );
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Loan Application Journey</h1>
                    <p className="text-gray-500">ID: #{applicationId} • Status: <span className="font-bold text-blue-600">{application?.status}</span></p>
                </div>
                {application?.status && application.status !== 'ENRICHING' && (
                    <div className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse">
                        Admin Mode Enabled
                    </div>
                )}
            </div>

            {/* Stepper Header */}
            <div className="flex justify-between mb-12 relative px-4">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
                {application?.stages?.map((stage, idx) => {
                    const isActive = application.currentStage && application.currentStage.order >= stage.order;
                    const isCompleted = (application.currentStage && application.currentStage.order > stage.order) || application.status === 'DISBURSED';
                    const isInspecting = adminView === stage.name;

                    return (
                        <div
                            key={stage.id}
                            className={`flex flex-col items-center cursor-pointer transition-all ${isInspecting ? 'scale-110' : 'hover:scale-105'}`}
                            onClick={() => toggleAdminView(stage.name)}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${isInspecting ? 'bg-yellow-400 border-yellow-500 text-gray-900 shadow-lg ring-4 ring-yellow-200' :
                                isActive ? (isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-600 border-blue-600 text-white') :
                                    'bg-white border-gray-300 text-gray-400'
                                }`}>
                                {isCompleted ? '✓' : idx + 1}
                            </div>
                            <span className={`mt-2 text-[10px] font-semibold uppercase tracking-tighter text-center max-w-[60px] ${isInspecting ? 'text-yellow-700' :
                                isActive ? 'text-blue-600' : 'text-gray-400'
                                }`}>{stage.name}</span>
                        </div>
                    );
                })}
            </div>

            {/* Admin Stage Data View */}
            {adminView && (
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
                    {renderAdminStageData()}
                </div>
            )}

            {/* Step Content */}
            <div className={`bg-white rounded-xl shadow-xl p-8 border border-gray-100 min-h-[400px] flex flex-col justify-center transition-opacity ${adminView ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>

                {step === 'SCORING' && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                        <h2 className="text-2xl font-bold mb-2">
                            {application.currentStage?.name === 'Entities' ? 'Initializing Application' :
                                application.currentStage?.name === 'ID Verification' ? 'Verifying Identity (EKENG)' :
                                    application.currentStage?.name === 'Income Verification' ? 'Verifying Income (NORQ)' :
                                        application.currentStage?.name === 'Credit Bureau' ? 'Checking Credit History (ACRA)' :
                                            'Analyzing Your Eligibility'}
                        </h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            We are currently processing your data via government registries and calculating your personalized loan offer.
                            This usually takes less than a minute.
                        </p>
                    </div>
                )}

                {step === 'OFFER' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6 text-center text-green-600">Congratulations! You have an Offer</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Loan Amount ({application.currency})
                                    </label>
                                    <input
                                        type="range"
                                        min="100000"
                                        max={application.approvedLimit}
                                        step="10000"
                                        value={selection.selectedAmount}
                                        onChange={(e) => setSelection({ ...selection, selectedAmount: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                                        <span>100k</span>
                                        <span className="font-bold text-blue-600 text-lg">{selection.selectedAmount.toLocaleString()}</span>
                                        <span>{application.approvedLimit.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Loan Term (Months)
                                    </label>
                                    <div className="flex gap-4">
                                        {[12, 24, 36].filter(t => t <= application.approvedTerm).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setSelection({ ...selection, selectedTerm: t })}
                                                className={`flex-1 py-3 rounded-lg border-2 font-bold transition ${selection.selectedTerm === t ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400 hover:border-blue-200'
                                                    }`}
                                            >
                                                {t} Months
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Interest Rate</span>
                                            <span className="font-bold">{application.interestRate}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Monthly Payment</span>
                                            <span className="font-bold text-xl text-blue-600">
                                                {Math.round((selection.selectedAmount * (1 + selection.selectedTerm * (application.interestRate / 1200))) / selection.selectedTerm).toLocaleString()} {application.currency}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSelectOffer}
                                    disabled={loading}
                                    className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition mt-6 shadow-lg shadow-blue-200"
                                >
                                    Select This Offer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'SIGNING' && (
                    <div className="text-center">
                        <div className="text-5xl mb-6">📄📄</div>
                        <h2 className="text-2xl font-bold mb-4">Legal Contracts Ready</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Please review and sign the 2 legal documents (Loan Agreement & Payment Schedule) to proceed.
                            These documents outline the legal terms and your repayment obligations.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href={applicationService.getAgreementUrl(applicationId)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition"
                            >
                                Download Agreement (PDF)
                            </a>
                            <button
                                onClick={handleSign}
                                disabled={loading}
                                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                            >
                                {loading ? 'Signing...' : 'Click to Sign Digitally'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'WAITING' && (
                    <div className="text-center">
                        <div className="animate-pulse text-5xl mb-6">⏳</div>
                        <h2 className="text-2xl font-bold mb-4">Processing Next Steps</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            We are preparing the next stage of your application. This should only take a moment.
                        </p>
                        <div className="flex justify-center">
                            <button onClick={fetchStatus} className="text-blue-600 font-bold hover:underline">Refresh Status</button>
                        </div>
                    </div>
                )}

                {step === 'MANUAL_REVIEW' && (
                    <div className="text-center">
                        <div className="text-5xl mb-6">🔍</div>
                        <h2 className="text-2xl font-bold mb-4">Under Manual Review</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Your application requires a manual check by our credit officers.
                            We will notify you once the review is complete.
                        </p>
                        <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 mb-8">
                            <h3 className="font-bold text-blue-800 mb-2">Simulated Back-Office Action</h3>
                            <p className="text-sm text-blue-600 mb-4">In a real app, this would be done by an admin. For this demo, you can act as the officer:</p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={handleApprove}
                                    disabled={loading}
                                    className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700"
                                >
                                    Approve Application
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={loading}
                                    className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700"
                                >
                                    Reject Application
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'OTP' && (
                    <div className="text-center max-w-sm mx-auto">
                        <div className="text-5xl mb-6">📱</div>
                        <h2 className="text-2xl font-bold mb-4">Final Verification</h2>
                        <p className="text-gray-500 mb-8">
                            We've sent a 6-digit verification code to your registered mobile number.
                        </p>
                        <div className="space-y-4">
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="w-full px-6 py-4 text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                            />
                            <button
                                onClick={handleVerifyOTP}
                                disabled={loading || otpCode.length < 6}
                                className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300"
                            >
                                {loading ? 'Verifying...' : 'Verify & Continue'}
                            </button>
                            <button
                                onClick={handleRequestOTP}
                                className="text-blue-600 text-sm font-semibold hover:underline"
                            >
                                Resend Code (SMS)
                            </button>
                        </div>
                    </div>
                )}

                {step === 'DISBURSEMENT' && (
                    <div className="max-w-md mx-auto w-full">
                        <h2 className="text-2xl font-bold mb-6 text-center">Where should we send the money?</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your bank's name"
                                    value={disbursement.bankName}
                                    onChange={(e) => setDisbursement({ ...disbursement, bankName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Account Number (IBAN)</label>
                                <input
                                    type="text"
                                    placeholder="AM00 0000 0000 0000 0000"
                                    value={disbursement.accountNumber}
                                    onChange={(e) => setDisbursement({ ...disbursement, accountNumber: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleSubmitDisbursement}
                                disabled={loading || !disbursement.bankName || !disbursement.accountNumber}
                                className="w-full py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition mt-4 shadow-lg shadow-green-200"
                            >
                                {loading ? 'Processing...' : 'Finalize & Disburse'}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest">
                                Processing via Armsoft Core Banking
                            </p>
                        </div>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                            ✓
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Loan Disbursed!</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            The funds are on their way to your account. You will receive a confirmation email shortly.
                            Thank you for choosing VistOs.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}

                {step === 'REJECTED' && (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                            ✕
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-red-600">Application Declined</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Unfortunately, we are unable to provide a loan offer at this time based on the data retrieved from external sources.
                        </p>
                        <button
                            onClick={() => navigate('/enrichment')}
                            className="px-8 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplicationJourney;
