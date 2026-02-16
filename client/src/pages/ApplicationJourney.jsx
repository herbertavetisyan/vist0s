import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import applicationService from '../services/applicationService';

const ApplicationJourney = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const applicationId = searchParams.get('id');

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
                setStep('WAITING'); // Generic waiting state
                break;
            case 'MANUAL_REVIEW':
                setStep('MANUAL_REVIEW');
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

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-800">Loan Application Journey</h1>
                <p className="text-gray-500">ID: #{applicationId}</p>
            </div>

            {/* Stepper Header */}
            <div className="flex justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
                {application?.stages?.map((stage, idx) => {
                    const isActive = application.currentStage && application.currentStage.order >= stage.order;
                    const isCompleted = application.currentStage && application.currentStage.order > stage.order;

                    return (
                        <div key={stage.id} className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${isActive ? (isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-600 border-blue-600 text-white') : 'bg-white border-gray-300 text-gray-400'
                                }`}>
                                {isCompleted ? '✓' : idx + 1}
                            </div>
                            <span className={`mt-2 text-[10px] font-semibold uppercase tracking-tighter ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{stage.name}</span>
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100 min-h-[400px] flex flex-col justify-center">

                {step === 'SCORING' && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                        <h2 className="text-2xl font-bold mb-2">Analyzing Your Eligibility</h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            We are currently processing your enrichment data and calculating a personalized loan offer.
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
                        <div className="text-5xl mb-6">📄</div>
                        <h2 className="text-2xl font-bold mb-4">Loan Agreement Ready</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Please review and sign your loan agreement to proceed.
                            This document outlines the legal terms and conditions of your loan.
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
