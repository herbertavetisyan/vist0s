import React, { useState, useEffect } from 'react';
import EnrichmentCard from '../components/EnrichmentCard';
import { createEnrichmentRequest, getEnrichmentRequest, listEnrichmentRequests } from '../services/enrichmentService';
import applicationService from '../services/applicationService';
import { useNavigate } from 'react-router-dom';

const Enrichment = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nationalId: '',
        phone: '',
        email: '',
        amountRequested: 500000,
        termRequested: 24
    });

    const [isLoanApp, setIsLoanApp] = useState(true);
    const [applicationId, setApplicationId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [polling, setPolling] = useState(false);

    // Fetch history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const data = await listEnrichmentRequests();
            setHistory(data.data || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    // Poll for updates when a request is active
    useEffect(() => {
        if (!currentRequest || !polling) return;

        const pollInterval = setInterval(async () => {
            try {
                const data = await getEnrichmentRequest(currentRequest.id);
                setCurrentRequest(data);

                // Stop polling when complete
                if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'PARTIAL') {
                    setPolling(false);
                    setLoading(false);
                    fetchHistory(); // Refresh history when a request finishes
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(pollInterval);
    }, [currentRequest, polling]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        setCurrentRequest(null);

        try {
            let response;
            if (isLoanApp) {
                // Submit full loan application
                response = await applicationService.submitApplication({
                    ...formData,
                    productTypeId: 1 // Default to Personal Loan
                });
                setApplicationId(response.applicationId);

                // For visualization, we still poll the enrichment request
                // The backend returns it in the application status, or we can assume ID match for now
                // Actually, the application status endpoint is better
                setCurrentRequest({
                    id: response.applicationId, // Hack: using app ID as label
                    status: response.status,
                    results: []
                });
            } else {
                // Just create enrichment request (Original behavior)
                response = await createEnrichmentRequest(formData);
                setCurrentRequest({
                    id: response.enrichmentRequestId,
                    status: response.status,
                    results: []
                });
            }

            setPolling(true);
            fetchHistory(); // Refresh history listing immediately

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process request');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleViewDetail = async (requestId) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getEnrichmentRequest(requestId);
            setCurrentRequest(data);
            setPolling(data.status === 'PENDING' || data.status === 'IN_PROGRESS');
            // Scroll to the results section
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError('Failed to fetch request details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-500';
            case 'FAILED':
                return 'bg-red-500';
            case 'PARTIAL':
                return 'bg-yellow-500';
            case 'IN_PROGRESS':
                return 'bg-blue-500 animate-pulse';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Applicant Enrichment</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form and Results */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Input Form */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Request Enrichment Data</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                                <label className="flex items-center gap-2 cursor-pointer font-semibold text-blue-800">
                                    <input
                                        type="checkbox"
                                        checked={isLoanApp}
                                        onChange={(e) => setIsLoanApp(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    Full Loan Application
                                </label>
                                <span className="text-xs text-blue-500 italic">Submit enrichment + Start 9-step journey</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium mb-1">National ID</label>
                                    <input
                                        type="text" name="nationalId" value={formData.nationalId}
                                        onChange={handleInputChange} required disabled={loading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="AB1234567"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium mb-1">Phone</label>
                                    <input
                                        type="tel" name="phone" value={formData.phone}
                                        onChange={handleInputChange} required disabled={loading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="+374XXXXXXXX"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email" name="email" value={formData.email}
                                        onChange={handleInputChange} required disabled={loading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="applicant@example.com"
                                    />
                                </div>

                                {isLoanApp && (
                                    <>
                                        <div className="lg:col-span-1">
                                            <label className="block text-sm font-medium mb-1">Amount</label>
                                            <input
                                                type="number" name="amountRequested" value={formData.amountRequested}
                                                onChange={handleInputChange} required disabled={loading}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <label className="block text-sm font-medium mb-1">Term (Mo)</label>
                                            <select
                                                name="termRequested" value={formData.termRequested}
                                                onChange={handleInputChange} required disabled={loading}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="12">12 Months</option>
                                                <option value="24">24 Months</option>
                                                <option value="36">36 Months</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-bold shadow-lg shadow-blue-200"
                            >
                                {loading && polling ? 'Processing Application...' : (isLoanApp ? 'Submit Loan Application' : 'Start Enrichment')}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Results Display */}
                    {currentRequest && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold">Details for #{currentRequest.id}</h2>
                                <div className="flex items-center gap-3">
                                    <span className={`px-4 py-2 rounded-full text-white font-semibold ${getStatusBadgeColor(currentRequest.status)}`}>
                                        {currentRequest.status}
                                    </span>
                                    {currentRequest.progress !== undefined && (
                                        <span className="text-sm text-gray-600 font-medium">
                                            Overall Progress: {currentRequest.progress}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* View Application Journey Button */}
                            {applicationId && (
                                <div className="mb-8 p-6 bg-green-50 border-2 border-green-500 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-green-800">Application Scoring in Progress</h3>
                                        <p className="text-green-700 text-sm">Once enrichment reaches 100%, your personalized loan offer will be ready.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/applications?id=${applicationId}`)}
                                        className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 whitespace-nowrap"
                                    >
                                        View Application Journey →
                                    </button>
                                </div>
                            )}

                            {/* Service Call Sequence */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h3 className="font-semibold mb-2 text-sm text-gray-700">Service Call Execution Chain:</h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="bg-white border px-2 py-1 rounded shadow-sm">1. NORQ</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="bg-white border px-2 py-1 rounded shadow-sm">2. EKENG</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="bg-white border px-2 py-1 rounded shadow-sm">3. ACRA</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="bg-indigo-50 border border-indigo-200 px-2 py-1 rounded shadow-sm font-semibold">4. DMS (Aggregator)</span>
                                </div>
                            </div>

                            {/* Individual Service Results */}
                            <div className="space-y-4">
                                {currentRequest.results && currentRequest.results.length > 0 ? (
                                    currentRequest.results.map((result, index) => (
                                        <EnrichmentCard key={index} result={result} />
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                        <p className="font-medium">Contacting external registries...</p>
                                        <p className="text-xs mt-1">This might take up to 30 seconds</p>
                                    </div>
                                )}
                            </div>

                            {/* Request Details Footer */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Audit Information</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                    <div>
                                        <span className="block text-xs text-gray-400 font-semibold mb-1">ID</span>
                                        <p className="font-mono bg-gray-50 px-2 py-1 rounded border overflow-hidden text-ellipsis">{currentRequest.id}</p>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-400 font-semibold mb-1">PASSPORT</span>
                                        <p className="font-sans font-medium">{currentRequest.nationalId || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-400 font-semibold mb-1">PHONE</span>
                                        <p className="font-sans font-medium">{currentRequest.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-400 font-semibold mb-1">EMAIL</span>
                                        <p className="font-sans font-medium truncate" title={currentRequest.email}>{currentRequest.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: History Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full max-h-[800px]">
                        <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
                            <h2 className="font-bold flex items-center gap-2">
                                <span className="bg-blue-600 w-2 h-2 rounded-full"></span>
                                Request History
                            </h2>
                            <button
                                onClick={fetchHistory}
                                className="text-xs text-gray-400 hover:text-white transition underline"
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                            {history.length > 0 ? (
                                history.map((req) => (
                                    <button
                                        key={req.id}
                                        onClick={() => handleViewDetail(req.id)}
                                        className={`w-full text-left p-4 hover:bg-blue-50 transition block border-l-4 ${currentRequest?.id === req.id ? 'border-blue-600 bg-blue-50' : 'border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-gray-800">#{req.id}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusBadgeColor(req.status)} text-white`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 font-medium truncate mb-1">
                                            {req.nationalId} | {req.email}
                                        </div>
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <span>📅</span> {new Date(req.createdAt).toLocaleString()}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-400 italic text-sm">
                                    No history records found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Enrichment;

